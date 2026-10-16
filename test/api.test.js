"use strict";

const { after, before, test } = require("node:test");
const assert = require("node:assert/strict");
const { createDatabase } = require("../db");
const { createApp } = require("../server");

let database;
let server;
let baseUrl;

before(async () => {
  database = createDatabase(":memory:");
  await new Promise((resolve) => {
    server = createApp(database).listen(0, "127.0.0.1", resolve);
  });
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
  database.close();
});

test("GET /api/recipes сортирует рецепты по времени", async () => {
  const response = await fetch(`${baseUrl}/api/recipes`);
  const recipes = await response.json();
  assert.equal(response.status, 200);
  assert.deepEqual(
    recipes.map((recipe) => recipe.cooking_time_min),
    [...recipes].map((recipe) => recipe.cooking_time_min).sort((a, b) => a - b),
  );
});

test("CRUD рецепта", async () => {
  const createdResponse = await fetch(`${baseUrl}/api/recipes`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: "Паста", difficulty: "medium", cooking_time_min: 30 }),
  });
  const created = await createdResponse.json();
  assert.equal(createdResponse.status, 201);

  const updatedResponse = await fetch(`${baseUrl}/api/recipes/${created.id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: "Паста с томатами", difficulty: "easy", cooking_time_min: 25 }),
  });
  assert.equal(updatedResponse.status, 200);
  assert.equal((await updatedResponse.json()).difficulty, "easy");

  assert.equal((await fetch(`${baseUrl}/api/recipes/${created.id}`, { method: "DELETE" })).status, 204);
  assert.equal((await fetch(`${baseUrl}/api/recipes/${created.id}`)).status, 404);
});

test("неизвестная сложность возвращает 400", async () => {
  assert.equal((await fetch(`${baseUrl}/api/recipes?difficulty=expert`)).status, 400);
});

test("невалидный рецепт возвращает 400", async () => {
  const response = await fetch(`${baseUrl}/api/recipes`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: "", difficulty: "easy", cooking_time_min: 0 }),
  });
  assert.equal(response.status, 400);
});

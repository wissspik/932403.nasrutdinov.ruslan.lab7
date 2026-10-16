"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { DatabaseSync } = require("node:sqlite");

const DIFFICULTIES = new Set(["easy", "medium", "hard"]);

function createDatabase(filename = path.join(__dirname, "data", "recipes.db")) {
  if (filename !== ":memory:") {
    fs.mkdirSync(path.dirname(filename), { recursive: true });
  }

  const database = new DatabaseSync(filename);
  database.exec("PRAGMA foreign_keys = ON;");
  database.exec(fs.readFileSync(path.join(__dirname, "schema.sql"), "utf8"));

  const { count } = database.prepare("SELECT COUNT(*) AS count FROM recipes").get();
  if (count === 0) {
    const insert = database.prepare(
      "INSERT INTO recipes (name, difficulty, cooking_time_min) VALUES (?, ?, ?)",
    );
    database.exec("BEGIN");
    try {
      insert.run("Овощной салат", "easy", 15);
      insert.run("Тыквенный суп", "medium", 45);
      insert.run("Домашняя лазанья", "hard", 95);
      database.exec("COMMIT");
    } catch (error) {
      database.exec("ROLLBACK");
      throw error;
    }
  }

  return database;
}

function validateRecipe(input) {
  const name = typeof input.name === "string" ? input.name.trim() : "";
  const difficulty = typeof input.difficulty === "string" ? input.difficulty.trim() : "";
  const cookingTime = Number(input.cooking_time_min);

  if (!name) return { error: "Название рецепта обязательно." };
  if (!DIFFICULTIES.has(difficulty)) {
    return { error: "Сложность должна быть easy, medium или hard." };
  }
  if (!Number.isInteger(cookingTime) || cookingTime <= 0) {
    return { error: "Время приготовления должно быть положительным целым числом." };
  }

  return { value: { name, difficulty, cooking_time_min: cookingTime } };
}

module.exports = { createDatabase, validateRecipe, DIFFICULTIES };

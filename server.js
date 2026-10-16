"use strict";

const path = require("node:path");
const express = require("express");
const { createDatabase, validateRecipe, DIFFICULTIES } = require("./db");

function createApp(database = createDatabase(process.env.DATABASE_PATH)) {
  const app = express();
  app.disable("x-powered-by");
  app.use(express.json({ limit: "32kb" }));

  app.get("/api/recipes", (request, response) => {
    const difficulty = request.query.difficulty;
    if (difficulty !== undefined && !DIFFICULTIES.has(difficulty)) {
      return response.status(400).json({ error: "Неизвестная сложность рецепта." });
    }

    const recipes = difficulty
      ? database
          .prepare("SELECT * FROM recipes WHERE difficulty = ? ORDER BY cooking_time_min ASC, id ASC")
          .all(difficulty)
      : database.prepare("SELECT * FROM recipes ORDER BY cooking_time_min ASC, id ASC").all();

    return response.json(recipes);
  });

  app.get("/api/recipes/:id", (request, response) => {
    const recipe = database.prepare("SELECT * FROM recipes WHERE id = ?").get(request.params.id);
    return recipe
      ? response.json(recipe)
      : response.status(404).json({ error: "Рецепт не найден." });
  });

  app.post("/api/recipes", (request, response) => {
    const validated = validateRecipe(request.body);
    if (validated.error) return response.status(400).json({ error: validated.error });

    const { name, difficulty, cooking_time_min: cookingTime } = validated.value;
    const result = database
      .prepare("INSERT INTO recipes (name, difficulty, cooking_time_min) VALUES (?, ?, ?)")
      .run(name, difficulty, cookingTime);
    const recipe = database.prepare("SELECT * FROM recipes WHERE id = ?").get(result.lastInsertRowid);
    return response.status(201).json(recipe);
  });

  app.put("/api/recipes/:id", (request, response) => {
    const validated = validateRecipe(request.body);
    if (validated.error) return response.status(400).json({ error: validated.error });

    const { name, difficulty, cooking_time_min: cookingTime } = validated.value;
    const result = database
      .prepare(
        "UPDATE recipes SET name = ?, difficulty = ?, cooking_time_min = ? WHERE id = ?",
      )
      .run(name, difficulty, cookingTime, request.params.id);
    if (result.changes === 0) return response.status(404).json({ error: "Рецепт не найден." });

    return response.json(
      database.prepare("SELECT * FROM recipes WHERE id = ?").get(request.params.id),
    );
  });

  app.delete("/api/recipes/:id", (request, response) => {
    const result = database.prepare("DELETE FROM recipes WHERE id = ?").run(request.params.id);
    return result.changes === 0
      ? response.status(404).json({ error: "Рецепт не найден." })
      : response.status(204).end();
  });

  app.use(express.static(path.join(__dirname, "public")));

  app.use((request, response) => {
    response.status(404).json({ error: "Маршрут не найден." });
  });

  app.use((error, request, response, next) => {
    console.error(error);
    response.status(500).json({ error: "Внутренняя ошибка сервера." });
  });

  app.locals.database = database;
  return app;
}

if (require.main === module) {
  const app = createApp();
  const port = Number(process.env.PORT) || 3000;
  app.listen(port, () => console.log(`Сервер запущен: http://localhost:${port}`));
}

module.exports = { createApp };

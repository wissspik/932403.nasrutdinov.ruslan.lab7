"use strict";

const difficultyNames = { easy: "Легко", medium: "Средне", hard: "Сложно" };
const list = document.getElementById("recipe-list");
const filter = document.getElementById("difficulty-filter");
const count = document.getElementById("recipe-count");
const message = document.getElementById("message");
const emptyState = document.getElementById("empty-state");
const dialog = document.getElementById("recipe-dialog");
const form = document.getElementById("recipe-form");
const title = document.getElementById("dialog-title");

async function api(url, options) {
  const response = await fetch(url, options);
  const body = response.status === 204 ? null : await response.json();
  if (!response.ok) throw new Error(body?.error || "Ошибка запроса.");
  return body;
}

function createRecipeCard(recipe) {
  const card = document.createElement("article");
  card.className = "recipe-card";
  card.dataset.id = recipe.id;

  const top = document.createElement("div");
  top.className = "recipe-card__top";
  const badge = document.createElement("span");
  badge.className = `difficulty difficulty--${recipe.difficulty}`;
  badge.textContent = difficultyNames[recipe.difficulty];
  const time = document.createElement("time");
  time.textContent = `${recipe.cooking_time_min} мин`;
  top.append(badge, time);

  const heading = document.createElement("h2");
  heading.textContent = recipe.name;

  const controls = document.createElement("div");
  controls.className = "card-actions";
  const edit = document.createElement("button");
  edit.type = "button";
  edit.className = "card-action";
  edit.dataset.action = "edit";
  edit.textContent = "Изменить";
  const remove = document.createElement("button");
  remove.type = "button";
  remove.className = "card-action card-action--danger";
  remove.dataset.action = "delete";
  remove.textContent = "Удалить";
  controls.append(edit, remove);

  card.append(top, heading, controls);
  return card;
}

async function loadRecipes() {
  try {
    const query = filter.value ? `?difficulty=${encodeURIComponent(filter.value)}` : "";
    const recipes = await api(`/api/recipes${query}`);
    list.replaceChildren(...recipes.map(createRecipeCard));
    count.textContent = `Найдено: ${recipes.length}`;
    emptyState.hidden = recipes.length !== 0;
  } catch (error) {
    message.textContent = error.message;
  }
}

function openCreateDialog() {
  form.reset();
  document.getElementById("recipe-id").value = "";
  title.textContent = "Новый рецепт";
  dialog.showModal();
  document.getElementById("recipe-name").focus();
}

async function openEditDialog(id) {
  try {
    const recipe = await api(`/api/recipes/${id}`);
    document.getElementById("recipe-id").value = recipe.id;
    document.getElementById("recipe-name").value = recipe.name;
    document.getElementById("recipe-difficulty").value = recipe.difficulty;
    document.getElementById("recipe-time").value = recipe.cooking_time_min;
    title.textContent = "Редактировать рецепт";
    dialog.showModal();
  } catch (error) {
    message.textContent = error.message;
  }
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const id = document.getElementById("recipe-id").value;
  const payload = {
    name: document.getElementById("recipe-name").value,
    difficulty: document.getElementById("recipe-difficulty").value,
    cooking_time_min: Number(document.getElementById("recipe-time").value),
  };

  try {
    await api(id ? `/api/recipes/${id}` : "/api/recipes", {
      method: id ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    dialog.close();
    message.textContent = id ? "Рецепт обновлён." : "Рецепт добавлен.";
    await loadRecipes();
  } catch (error) {
    message.textContent = error.message;
  }
});

list.addEventListener("click", async (event) => {
  const button = event.target.closest("button[data-action]");
  const id = button?.closest(".recipe-card")?.dataset.id;
  if (!button || !id) return;

  if (button.dataset.action === "edit") {
    await openEditDialog(id);
    return;
  }

  if (!window.confirm("Удалить выбранный рецепт?")) return;
  try {
    await api(`/api/recipes/${id}`, { method: "DELETE" });
    message.textContent = "Рецепт удалён.";
    await loadRecipes();
  } catch (error) {
    message.textContent = error.message;
  }
});

document.getElementById("open-form").addEventListener("click", openCreateDialog);
document.getElementById("close-dialog").addEventListener("click", () => dialog.close());
document.getElementById("cancel-dialog").addEventListener("click", () => dialog.close());
filter.addEventListener("change", loadRecipes);
loadRecipes();

import { test, expect } from "@playwright/test";
import { resetAndLogin, createExercise } from "./helpers";

test.beforeEach(async ({ page }) => {
  await resetAndLogin(page);
});

test.describe("Exercise List", () => {
  test("empty state shows prompt to create exercise", async ({ page }) => {
    await page.goto("/exercise");

    await expect(page.getByText("No exercises yet")).toBeVisible();
    await expect(
      page.getByRole("link", { name: /create your first exercise/i })
    ).toBeVisible();
  });

  test("lists exercises with weight and reps", async ({ page }) => {
    await createExercise(page, "Bench Press", {
      weight: "60",
      reps: "8",
    });
    await createExercise(page, "Squat", { weight: "100", reps: "5" });

    await page.goto("/exercise");

    await expect(page.getByText("Bench Press")).toBeVisible();
    await expect(page.getByText("60 kg")).toBeVisible();
    await expect(page.getByText("8 reps")).toBeVisible();

    await expect(page.getByText("Squat")).toBeVisible();
    await expect(page.getByText("100 kg")).toBeVisible();
    await expect(page.getByText("5 reps")).toBeVisible();
  });

  test("exercise list shows description when present", async ({ page }) => {
    await createExercise(page, "Bench Press", {
      description: "Flat barbell bench",
      weight: "60",
      reps: "8",
    });

    await page.goto("/exercise");

    await expect(page.getByText("Flat barbell bench")).toBeVisible();
  });

  test("can navigate to exercise detail by clicking name", async ({
    page,
  }) => {
    await createExercise(page, "Bench Press", { weight: "60", reps: "8" });

    await page.goto("/exercise");
    await page.getByRole("link", { name: "Bench Press" }).click();

    await expect(page).toHaveURL(/\/exercise\/.+/);
    await expect(
      page.getByRole("heading", { name: "Bench Press" })
    ).toBeVisible();
  });
});

test.describe("Create Exercise", () => {
  test("can create exercise with all fields", async ({ page }) => {
    await page.goto("/exercise/create");

    await page.getByLabel("Name *").fill("Romanian Deadlift");
    await page.getByLabel("Description").fill("Hip hinge movement");
    await page.getByLabel("Default Weight").fill("80");
    await page.getByLabel("Default Reps").fill("10");

    await page.getByRole("button", { name: "Create Exercise" }).click();

    // Redirects to exercise list
    await expect(page).toHaveURL("/exercise");
    await expect(page.getByText("Romanian Deadlift")).toBeVisible();
    await expect(page.getByText("80 kg")).toBeVisible();
    await expect(page.getByText("10 reps")).toBeVisible();
  });

  test("can create exercise with name and weight only", async ({ page }) => {
    await page.goto("/exercise/create");

    await page.getByLabel("Name *").fill("Plank");
    await page.getByLabel("Default Weight").fill("0");
    await page.getByLabel("Default Reps").fill("1");
    await page.getByRole("button", { name: "Create Exercise" }).click();

    await expect(page).toHaveURL("/exercise");
    await expect(page.getByText("Plank")).toBeVisible();
  });

  test("shows validation error for empty name", async ({ page }) => {
    await page.goto("/exercise/create");

    // Submit with empty name
    await page.getByRole("button", { name: "Create Exercise" }).click();

    // Should stay on create page with error
    await expect(page).toHaveURL("/exercise/create");
    await expect(page.getByText("Exercise name is required")).toBeVisible();
  });

  test("cancel button returns to exercise list", async ({ page }) => {
    await page.goto("/exercise/create");

    await page.getByLabel("Name *").fill("Should Not Save");
    await page.getByRole("button", { name: "Cancel" }).click();

    await expect(page).toHaveURL("/exercise");
    await expect(page.getByText("Should Not Save")).not.toBeVisible();
  });
});

test.describe("View Exercise Detail", () => {
  test("shows all exercise fields", async ({ page }) => {
    await createExercise(page, "Bench Press", {
      description: "Flat barbell bench press",
      weight: "60",
      reps: "8",
    });

    // Navigate to detail page
    await page.getByRole("link", { name: "Bench Press" }).click();
    await expect(page).toHaveURL(/\/exercise\/.+/);

    await expect(
      page.getByRole("heading", { name: "Bench Press" })
    ).toBeVisible();
    await expect(page.getByText("Flat barbell bench press")).toBeVisible();
    await expect(page.getByText("60 kg")).toBeVisible();
    await expect(page.getByText("8")).toBeVisible();
  });

  test("shows weight and reps values on detail page", async ({ page }) => {
    await createExercise(page, "Squat", { weight: "100", reps: "5" });

    await page.getByRole("link", { name: "Squat" }).click();

    await expect(page.getByText("100 kg")).toBeVisible();
    await expect(page.getByText("5")).toBeVisible();
  });

  test("has edit and delete buttons", async ({ page }) => {
    await createExercise(page, "Squat", { weight: "100", reps: "5" });

    await page.getByRole("link", { name: "Squat" }).click();

    await expect(page.getByRole("link", { name: /edit/i })).toBeVisible();
    await expect(
      page.getByRole("button", { name: /delete/i })
    ).toBeVisible();
  });

  test("back button returns to exercise list", async ({ page }) => {
    await createExercise(page, "Squat", { weight: "100", reps: "5" });

    await page.getByRole("link", { name: "Squat" }).click();
    await expect(page).toHaveURL(/\/exercise\/.+/);

    await page.getByRole("button", { name: /back/i }).click();
    await expect(page).toHaveURL("/exercise");
  });

  test("not found state for invalid exercise ID", async ({ page }) => {
    await page.goto("/exercise/nonexistent-id");

    await expect(page.getByText("Exercise Not Found")).toBeVisible();
    await expect(
      page.getByRole("link", { name: /back to exercises/i })
    ).toBeVisible();
  });
});

test.describe("Edit Exercise", () => {
  test("edit page loads with pre-filled values", async ({ page }) => {
    await createExercise(page, "Bench Press", {
      description: "Flat bench",
      weight: "60",
      reps: "8",
    });

    // Navigate to detail then edit
    await page.getByRole("link", { name: "Bench Press" }).click();
    await page.getByRole("link", { name: /edit/i }).click();
    await expect(page).toHaveURL(/\/exercise\/.+\/edit/);

    await expect(page.getByLabel("Name *")).toHaveValue("Bench Press");
    await expect(page.getByLabel("Description")).toHaveValue("Flat bench");
    await expect(page.getByLabel("Default Weight")).toHaveValue("60");
    await expect(page.getByLabel("Default Reps")).toHaveValue("8");
  });

  test("can edit exercise name and save", async ({ page }) => {
    await createExercise(page, "Bench Press", { weight: "60", reps: "8" });

    await page.getByRole("link", { name: "Bench Press" }).click();
    await page.getByRole("link", { name: /edit/i }).click();

    await page.getByLabel("Name *").fill("Incline Bench Press");
    await page.getByRole("button", { name: "Save Changes" }).click();

    // Should redirect to detail page with updated name
    await expect(page).toHaveURL(/\/exercise\/.+/);
    await expect(page).not.toHaveURL(/\/edit/);
    await expect(
      page.getByRole("heading", { name: "Incline Bench Press" })
    ).toBeVisible();
  });

  test("can edit weight and reps", async ({ page }) => {
    await createExercise(page, "Squat", { weight: "80", reps: "5" });

    await page.getByRole("link", { name: "Squat" }).click();
    await page.getByRole("link", { name: /edit/i }).click();

    await page.getByLabel("Default Weight").fill("100");
    await page.getByLabel("Default Reps").fill("3");
    await page.getByRole("button", { name: "Save Changes" }).click();

    // Verify updated values on detail page
    await expect(page.getByText("100 kg")).toBeVisible();
    await expect(page.getByText("3")).toBeVisible();
  });

  test("cancel returns to detail without saving", async ({ page }) => {
    await createExercise(page, "Squat", { weight: "80", reps: "5" });

    await page.getByRole("link", { name: "Squat" }).click();
    await page.getByRole("link", { name: /edit/i }).click();

    // Change values but cancel
    await page.getByLabel("Name *").fill("Changed Name");
    await page.getByRole("button", { name: "Cancel" }).click();

    // Should show original name
    await expect(
      page.getByRole("heading", { name: "Squat" })
    ).toBeVisible();
  });

  test("not found state for invalid exercise ID on edit page", async ({
    page,
  }) => {
    await page.goto("/exercise/nonexistent-id/edit");

    await expect(page.getByText("Exercise Not Found")).toBeVisible();
    await expect(
      page.getByRole("link", { name: /back to exercises/i })
    ).toBeVisible();
  });
});

test.describe("Delete Exercise", () => {
  test("can delete exercise from list page dropdown", async ({ page }) => {
    await createExercise(page, "Bench Press", { weight: "60", reps: "8" });

    await page.goto("/exercise");
    await expect(page.getByText("Bench Press")).toBeVisible();

    // Open dropdown menu
    await page.getByRole("button", { name: /open menu/i }).click();
    await page.getByRole("menuitem", { name: /delete/i }).click();

    // Verify confirmation dialog
    await expect(page.getByText("Delete Exercise")).toBeVisible();
    await expect(
      page.getByText(/are you sure you want to delete "Bench Press"/i)
    ).toBeVisible();

    // Confirm
    await page.getByRole("button", { name: "Delete" }).click();

    // Should show empty state
    await expect(page.getByText("No exercises yet")).toBeVisible();
  });

  test("can cancel delete from list page", async ({ page }) => {
    await createExercise(page, "Bench Press", { weight: "60", reps: "8" });

    await page.goto("/exercise");
    await page.getByRole("button", { name: /open menu/i }).click();
    await page.getByRole("menuitem", { name: /delete/i }).click();

    // Cancel
    await page.getByRole("button", { name: "Cancel" }).click();

    // Exercise still there
    await expect(page.getByText("Bench Press")).toBeVisible();
  });

  test("can delete exercise from detail page", async ({ page }) => {
    await createExercise(page, "Bench Press", { weight: "60", reps: "8" });

    await page.getByRole("link", { name: "Bench Press" }).click();

    // Click delete button on detail page
    await page.getByRole("button", { name: /delete/i }).click();

    // Confirm dialog
    await expect(page.getByText("Delete Exercise")).toBeVisible();
    await page.getByRole("button", { name: "Delete" }).click();

    // Should redirect to exercise list
    await expect(page).toHaveURL("/exercise");
    await expect(page.getByText("Bench Press")).not.toBeVisible();
  });

  test("can cancel delete from detail page", async ({ page }) => {
    await createExercise(page, "Bench Press", { weight: "60", reps: "8" });

    await page.getByRole("link", { name: "Bench Press" }).click();
    await page.getByRole("button", { name: /delete/i }).click();

    await page.getByRole("button", { name: "Cancel" }).click();

    // Still on detail page with exercise data
    await expect(
      page.getByRole("heading", { name: "Bench Press" })
    ).toBeVisible();
  });

  test("deleting last exercise shows empty state", async ({ page }) => {
    await createExercise(page, "Only Exercise", { weight: "50", reps: "10" });

    await page.goto("/exercise");
    await page.getByRole("button", { name: /open menu/i }).click();
    await page.getByRole("menuitem", { name: /delete/i }).click();
    await page.getByRole("button", { name: "Delete" }).click();

    await expect(page.getByText("No exercises yet")).toBeVisible();
    await expect(
      page.getByRole("link", { name: /create your first exercise/i })
    ).toBeVisible();
  });
});

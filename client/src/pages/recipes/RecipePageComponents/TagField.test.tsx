import { describe, it, expect, vi, beforeAll } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithChakra } from "@/test/renderWithProviders";
import { TagField, type TagItem } from "./TagField";

beforeAll(() => {
  globalThis.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
});

const mealTypes: TagItem[] = [
  { id: "1", name: "Breakfast", color: "#AEE553" },
  { id: "2", name: "Lunch", color: "#4FC3F7" },
  { id: "3", name: "Dinner", color: "#FF6B6B" },
];

describe("TagField", () => {
  it("renders selected tags", () => {
    renderWithChakra(
      <TagField
        allItems={mealTypes}
        selected={[mealTypes[0], mealTypes[1]]}
        onChange={vi.fn()}
      />
    );
    expect(screen.getByText("Breakfast")).toBeInTheDocument();
    expect(screen.getByText("Lunch")).toBeInTheDocument();
    expect(screen.queryByText("Dinner")).not.toBeInTheDocument();
  });

  it("calls onChange without the removed item when close button clicked", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    renderWithChakra(
      <TagField
        allItems={mealTypes}
        selected={[mealTypes[0], mealTypes[1]]}
        onChange={onChange}
      />
    );
    await user.click(screen.getByLabelText("Remove Breakfast"));
    expect(onChange).toHaveBeenCalledWith([mealTypes[1]]);
  });

  it("shows available items in the Add menu", async () => {
    const user = userEvent.setup();
    renderWithChakra(
      <TagField
        allItems={mealTypes}
        selected={[mealTypes[0]]}
        onChange={vi.fn()}
      />
    );
    await user.click(screen.getByRole("button", { name: "+ Add" }));
    expect(screen.getByText("Lunch")).toBeInTheDocument();
    expect(screen.getByText("Dinner")).toBeInTheDocument();
  });

  it("calls onChange with the added item when a menu item is clicked", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    renderWithChakra(
      <TagField
        allItems={mealTypes}
        selected={[mealTypes[0]]}
        onChange={onChange}
      />
    );
    await user.click(screen.getByRole("button", { name: "+ Add" }));
    await user.click(screen.getByText("Lunch"));
    expect(onChange).toHaveBeenCalledWith([mealTypes[0], mealTypes[1]]);
  });

  it("shows (none available) when all items are selected", async () => {
    const user = userEvent.setup();
    renderWithChakra(
      <TagField
        allItems={mealTypes}
        selected={mealTypes}
        onChange={vi.fn()}
      />
    );
    await user.click(screen.getByRole("button", { name: "+ Add" }));
    expect(screen.getByText("(none available)")).toBeInTheDocument();
  });

  it("renders validation error", () => {
    renderWithChakra(
      <TagField
        allItems={mealTypes}
        selected={[]}
        onChange={vi.fn()}
        error="At least one meal type is required."
      />
    );
    expect(screen.getByRole("alert")).toHaveTextContent(
      "At least one meal type is required."
    );
  });

  it("renders conflict error", () => {
    renderWithChakra(
      <TagField
        allItems={mealTypes}
        selected={[mealTypes[0]]}
        onChange={vi.fn()}
        conflictError="Can't remove — used in: Schedule A"
      />
    );
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Can't remove — used in: Schedule A"
    );
  });

  it("renders without color dots for items without color", () => {
    const dishTypes: TagItem[] = [
      { id: "1", name: "Main" },
      { id: "2", name: "Side" },
    ];
    renderWithChakra(
      <TagField
        allItems={dishTypes}
        selected={[dishTypes[0]]}
        onChange={vi.fn()}
      />
    );
    expect(screen.getByText("Main")).toBeInTheDocument();
  });
});

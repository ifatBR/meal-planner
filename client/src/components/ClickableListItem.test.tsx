import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ChakraProvider } from "@chakra-ui/react";
import { system } from "@/styles/theme";
import { ClickableListItem } from "./ClickableListItem";

function renderItem(props: React.ComponentProps<typeof ClickableListItem>) {
  return render(
    <ChakraProvider value={system}>
      <ClickableListItem {...props} />
    </ChakraProvider>
  );
}

describe("ClickableListItem", () => {
  it("renders name as body text", () => {
    renderItem({ name: "Chicken" });
    expect(screen.getByText("Chicken")).toBeInTheDocument();
  });

  it("renders nameDisplay in place of name when provided", () => {
    renderItem({ name: "Chicken", nameDisplay: <span>Custom Display</span> });
    expect(screen.getByText("Custom Display")).toBeInTheDocument();
    expect(screen.queryByText("Chicken")).not.toBeInTheDocument();
  });

  it("calls onClick when the row is clicked", async () => {
    const onClick = vi.fn();
    const user = userEvent.setup();
    renderItem({ name: "Chicken", onClick });
    await user.click(screen.getByText("Chicken"));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("shows inlineError below the row when provided", () => {
    renderItem({ name: "Chicken", inlineError: "Something went wrong." });
    expect(screen.getByText("Something went wrong.")).toBeInTheDocument();
  });

  it("does not render an inline error when inlineError is not provided", () => {
    renderItem({ name: "Chicken" });
    expect(screen.queryByText("Something went wrong.")).not.toBeInTheDocument();
  });
});

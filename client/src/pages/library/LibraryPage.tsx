import { useState } from "react";
import { useLocation } from "react-router-dom";
import { Box, Flex, Tabs } from "@chakra-ui/react";
import { PageTitle } from "@/components/Typography";
import { MealTypesTab } from "./tabs/MealTypesTab";
import { DishTypesTab } from "./tabs/DishTypesTab";
import { IngredientsTab } from "./tabs/IngredientsTab";
import { RecipesTab } from "./tabs/RecipesTab";
import { LayoutsTab } from "./tabs/LayoutsTab";
import {
  BORDER_WIDTHS,
  COLORS,
  FONT_SIZES,
  FONT_WEIGHTS,
  SPACING,
} from "@/styles/designTokens";

export function LibraryPage() {
  const location = useLocation();
  const navState = location.state as {
    activeTab?: number;
    recipesPage?: number;
  } | null;
  const [activeTab, setActiveTab] = useState(navState?.activeTab ?? 0);

  const TABS = [
    { label: "Meal Types", content: <MealTypesTab /> },
    { label: "Dish Types", content: <DishTypesTab /> },
    { label: "Ingredients", content: <IngredientsTab /> },
    {
      label: "Recipes",
      content: <RecipesTab initialPage={navState?.recipesPage} />,
    },
    { label: "Layouts", content: <LayoutsTab /> },
  ];

  return (
    <Flex direction="column" gap={SPACING[6]}>
      <PageTitle>Library</PageTitle>

      <Tabs.Root
        value={String(activeTab)}
        onValueChange={(e) => setActiveTab(Number(e.value))}
      >
        <Tabs.List
          borderBottomWidth={BORDER_WIDTHS.sm}
          borderBottomColor={COLORS.border.default}
          gap={SPACING[1]}
        >
          {TABS.map((tab, index) => (
            <Tabs.Trigger
              key={tab.label}
              value={String(index)}
              px={SPACING[4]}
              py={SPACING[3]}
              fontSize={FONT_SIZES.base}
              fontWeight={FONT_WEIGHTS.medium}
              color={
                activeTab === index
                  ? COLORS.primary.default
                  : COLORS.text.secondary
              }
              borderBottomWidth={BORDER_WIDTHS.md}
              borderBottomColor={
                activeTab === index ? COLORS.primary.default : "transparent"
              }
              bg="transparent"
              _hover={{ color: COLORS.primary.default }}
              transition="color 0.15s ease, border-color 0.15s ease"
            >
              {tab.label}
            </Tabs.Trigger>
          ))}
        </Tabs.List>

        {TABS.map((tab, index) => (
          <Tabs.Content key={tab.label} value={String(index)}>
            {tab.content ?? (
              <Box
                pt={SPACING[6]}
                color={COLORS.text.secondary}
                fontSize={FONT_SIZES.base}
              >
                {tab.label} — coming soon
              </Box>
            )}
          </Tabs.Content>
        ))}
      </Tabs.Root>
    </Flex>
  );
}

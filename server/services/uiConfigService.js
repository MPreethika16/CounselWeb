/**
 * Serves dynamic frontend configuration properties, feature flags, and layouts.
 */

export function getFrontendConfig() {
  return {
    theme: {
      primaryColor: "#4F46E5",
      darkModeEnabled: true,
      fontFamily: "Inter, sans-serif"
    },
    features: {
      enableAdvancedFilters: true,
      enableComparisons: true,
      enablePersonalization: true,
      showConfidenceBadges: true,
      maintenanceMode: false
    },
    navigation: {
      mainMenu: [
        { label: "Home", path: "/" },
        { label: "Search Colleges", path: "/search" },
        { label: "Recommendations", path: "/recommendations", authRequired: true },
        { label: "Compare", path: "/compare" }
      ],
      adminMenu: [
        { label: "Dashboard", path: "/admin/dashboard", role: "admin" },
        { label: "Scraper Health", path: "/admin/scrapers", role: "admin" }
      ]
    },
    constants: {
      maxCompareCount: 5,
      paginationLimitDefault: 10
    }
  };
}

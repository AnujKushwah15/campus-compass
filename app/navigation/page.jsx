import ClientRouteNavigator from "./ClientRouteNavigator";

export const metadata = {
    title: "Route Navigator | Campus Compass",
    description: "Find the shortest path between any two places with real-time ETA.",
};

export default function NavigationPage() {
    return <ClientRouteNavigator />;
}

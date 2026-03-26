"use client";
import dynamic from "next/dynamic";

const RouteNavigator = dynamic(
    () => import("@/features/navigation/components/RouteNavigator"),
    { ssr: false }
);

export default function ClientRouteNavigator() {
    return <RouteNavigator />;
}

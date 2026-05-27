export function loadTourViewer() {
  return import("@/components/tour/TourViewer").then((mod) => mod.TourViewer);
}

export function preloadTourViewer() {
  void import("@/components/tour/TourViewer");
}

import {
  Footprints,
  Bike,
  Waves,
  Mountain,
  Dumbbell,
  PersonStanding,
  Activity,
} from "lucide-react";

// Strava has dozens of sport_type values — this covers the common ones
// and falls back to a generic activity icon for anything else, rather
// than trying to enumerate every possible type.
const ICON_BY_SPORT_TYPE = {
  Run: Footprints,
  TrailRun: Footprints,
  VirtualRun: Footprints,
  Ride: Bike,
  MountainBikeRide: Bike,
  GravelRide: Bike,
  VirtualRide: Bike,
  EBikeRide: Bike,
  EMountainBikeRide: Bike,
  Handcycle: Bike,
  Swim: Waves,
  Walk: Mountain,
  Hike: Mountain,
  Snowshoe: Mountain,
  WeightTraining: Dumbbell,
  Workout: Dumbbell,
  Crossfit: Dumbbell,
  HighIntensityIntervalTraining: Dumbbell,
  Yoga: PersonStanding,
  Pilates: PersonStanding,
};

export default function SportIcon({ sportType, size = 15 }) {
  const Icon = ICON_BY_SPORT_TYPE[sportType] || Activity;
  return <Icon size={size} strokeWidth={2} />;
}

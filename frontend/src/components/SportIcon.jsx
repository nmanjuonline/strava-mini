import {
  Footprints,
  Bike,
  Waves,
  Mountain,
  Dumbbell,
  PersonStanding,
  Activity,
  Snowflake,
  Sailboat,
  Wind,
  Accessibility,
  Music,
  CircleDot,
} from "lucide-react";

// Strava supports ~45 sport types (see
// https://support.strava.com/en-us/articles/15402005). Their own icons
// are proprietary brand assets we can't embed, so this maps each type to
// a close generic equivalent instead, grouped by category, with a
// fallback for anything not listed here.
const ICON_BY_SPORT_TYPE = {
  // Foot sports
  Run: Footprints,
  TrailRun: Footprints,
  VirtualRun: Footprints,
  Walk: Footprints,
  Hike: Mountain,
  Wheelchair: Accessibility,

  // Cycle sports
  Ride: Bike,
  EBikeRide: Bike,
  MountainBikeRide: Bike,
  EMountainBikeRide: Bike,
  GravelRide: Bike,
  VirtualRide: Bike,
  Velomobile: Bike,
  Handcycle: Bike,

  // Water sports
  Swim: Waves,
  Canoe: Waves,
  Kayak: Waves,
  StandUpPaddling: Waves,
  Rowing: Waves,
  Surf: Wind,
  Kitesurf: Wind,
  Windsurf: Wind,
  Sail: Sailboat,

  // Winter sports
  IceSkate: Snowflake,
  NordicSki: Snowflake,
  AlpineSki: Snowflake,
  Snowboard: Snowflake,
  BackcountrySki: Snowflake,
  Snowshoe: Snowflake,
  RollerSki: Snowflake,

  // Strength / fitness
  WeightTraining: Dumbbell,
  Workout: Dumbbell,
  Crossfit: Dumbbell,
  HighIntensityIntervalTraining: Dumbbell,
  StairStepper: Dumbbell,
  Elliptical: Dumbbell,
  Yoga: PersonStanding,
  Pilates: PersonStanding,
  Dance: Music,
  RockClimbing: Mountain,

  // Ball / racquet / court sports
  Golf: CircleDot,
  Badminton: CircleDot,
  Basketball: CircleDot,
  Tennis: CircleDot,
  Padel: CircleDot,
  Soccer: CircleDot,
  Pickleball: CircleDot,
  Volleyball: CircleDot,
  Squash: CircleDot,
  TableTennis: CircleDot,
  Racquetball: CircleDot,
  Cricket: CircleDot,
};

export default function SportIcon({ sportType, size = 15 }) {
  const Icon = ICON_BY_SPORT_TYPE[sportType] || Activity;
  return <Icon size={size} strokeWidth={2} />;
}

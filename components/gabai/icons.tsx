// UI icons from lucide-react, at the sizes and stroke weights used in Figma.
// (Figma's 24-unit icons are lucide glyphs; strokes below are in lucide's
// 24-unit space, e.g. a 22px Figma icon with a 1.83 stroke = strokeWidth 2.)
import {
  Accessibility,
  ArrowRight,
  ArrowUp,
  Building,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Compass,
  IdCard,
  MapPin,
  Navigation,
  Route,
  SlidersHorizontal,
  Store,
  Users,
  type LucideIcon,
} from 'lucide-react';
import type { ServiceIcon } from '@/lib/demo-data';

export const ServiceIcons: Record<ServiceIcon, LucideIcon> = {
  access: Accessibility,
  store: Store,
  users: Users,
  idcard: IdCard,
};

export {
  ArrowRight,
  ArrowUp,
  Building,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Compass,
  MapPin,
  Navigation,
  Route,
  SlidersHorizontal,
};

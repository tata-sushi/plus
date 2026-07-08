import {
  Megaphone,
  GraduationCap,
  ClipboardList,
  HeartHandshake,
  Sparkles,
  ChefHat,
  Fish,
  Waves,
  Utensils,
  CreditCard,
  Bike,
  Boxes,
  Sparkle,
  Wine,
  ShieldCheck,
  HeartPulse,
  Wrench,
  Square,
} from 'lucide-react'

export const iconMap = {
  Megaphone,
  GraduationCap,
  ClipboardList,
  HeartHandshake,
  Sparkles,
  ChefHat,
  Fish,
  Waves,
  Utensils,
  CreditCard,
  Bike,
  Boxes,
  Sparkle,
  Wine,
  ShieldCheck,
  HeartPulse,
  Wrench,
}

export function resolveIcon(name) {
  return iconMap[name] ?? Square
}

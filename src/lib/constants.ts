export const CLASS_META: Record<
  string,
  { label: string; color: string; bg: string; border: string }
> = {
  mini_skirt: {
    label: "Mini jupe",
    color: "text-pink-400",
    bg: "bg-pink-400/10",
    border: "border-pink-400/30",
  },
  headwear: {
    label: "Couvre-chef",
    color: "text-blue-400",
    bg: "bg-blue-400/10",
    border: "border-blue-400/30",
  },
  joggers: {
    label: "Jogging",
    color: "text-purple-400",
    bg: "bg-purple-400/10",
    border: "border-purple-400/30",
  },
  sandals: {
    label: "Sandales",
    color: "text-orange-400",
    bg: "bg-orange-400/10",
    border: "border-orange-400/30",
  },
  flip_flops: {
    label: "Claquettes",
    color: "text-yellow-400",
    bg: "bg-yellow-400/10",
    border: "border-yellow-400/30",
  },
  ripped_clothes: {
    label: "Habits troués",
    color: "text-red-400",
    bg: "bg-red-400/10",
    border: "border-red-400/30",
  },
  sportswear: {
    label: "Habits de sport",
    color: "text-green-400",
    bg: "bg-green-400/10",
    border: "border-green-400/30",
  },
};

export const ALL_CLASSES = Object.keys(CLASS_META);

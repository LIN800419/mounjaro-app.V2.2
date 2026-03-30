"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  Scale,
  HeartPulse,
  Flame,
  Bell,
  Utensils,
  TrendingDown,
  Droplets,
  AlertTriangle,
  Activity,
  Target,
  CalendarClock,
  Pencil,
  Trash2,
  Download,
  Syringe,
  RotateCcw,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";

type Sex = "male" | "female";
type Appetite = "下降" | "正常" | "偏餓";
type CravingLevel = "低" | "中" | "高";
type SideEffect =
  | "無"
  | "噁心"
  | "便秘"
  | "腹脹"
  | "腹瀉"
  | "胃食道逆流"
  | "頭暈"
  | "疲倦"
  | "注射部位不適";

type SideEffectItem = {
  effect: SideEffect;
  severity: string;
};

type Entry = {
  id: string;
  date: string;
  weight: string;
  dose: string;
  appetite: Appetite;
  cravingLevel: CravingLevel;
  sideEffect: SideEffect;
  sideEffectSeverity: string;
  sideEffects: SideEffectItem[];
  exerciseMin: string;
  isShotDay: boolean;
};

type Settings = {
  firstShotDate: string;
  notificationsOn: boolean;
  elcdMode: boolean;
  height: string;
  age: string;
  goal: string;
  sex: Sex;
  activity: string;
  shotInterval: string;
  remindOneDayBefore: boolean;
  remindOnShotDay: boolean;
  remindIfNoLogByNight: boolean;
  waterReminder: boolean;
  proteinReminder: boolean;
};

type MealPlan = {
  title: string;
  meals: { name: string; items: string[] }[];
};

type PenInventory = {
  penStrength: string;
  totalPens: string;
  usedGrids: string;
};

type PhotoRecord = {
  id: string;
  date: string;
  note: string;
  imageData: string;
};

const STORAGE_KEY = "simple-mounjaro-tracker-v3";
const SETTINGS_KEY = "simple-mounjaro-settings-v3";
const PEN_INVENTORY_KEY = "simple-mounjaro-pen-inventory-v1";
const PHOTO_RECORDS_KEY = "simple-mounjaro-photo-records-v1";

function num(v: unknown) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function getBMI(h: number, w: number) {
  if (!h || !w) return 0;
  const m = h / 100;
  return +(w / (m * m)).toFixed(1);
}

function getBMILabel(bmi: number) {
  if (!bmi) return "-";
  if (bmi < 18.5) return "過輕";
  if (bmi < 24) return "正常";
  if (bmi < 27) return "過重";
  if (bmi < 30) return "輕度肥胖";
  if (bmi < 35) return "中度肥胖";
  return "重度肥胖";
}

function getBMR(weight: number, height: number, age: number, sex: Sex) {
  if (!weight || !height || !age) return 0;
  if (sex === "female") {
    return Math.round(10 * weight + 6.25 * height - 5 * age - 161);
  }
  return Math.round(10 * weight + 6.25 * height - 5 * age + 5);
}

function parseLocalDate(dateStr: string) {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(year, (month || 1) - 1, day || 1);
}

function formatLocalDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getTodayLocalDate() {
  return formatLocalDate(new Date());
}

function daysBetween(a: string, b: string) {
  const diff = parseLocalDate(b).getTime() - parseLocalDate(a).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

function plusDays(dateStr: string, days: number) {
  const d = parseLocalDate(dateStr);
  d.setDate(d.getDate() + days);
  return formatLocalDate(d);
}

function getNextShotDate(baseShotDate: string, intervalDays: number, todayStr: string) {
  if (!baseShotDate) return "";

  const safeInterval = Math.max(1, intervalDays || 7);
  let nextDate = plusDays(baseShotDate, safeInterval);

  while (daysBetween(todayStr, nextDate) < 0) {
    nextDate = plusDays(nextDate, safeInterval);
  }

  return nextDate;
}

function getLatestShotDate(entries: Entry[]) {
  const shotEntries = entries.filter((entry) => entry.isShotDay);
  if (!shotEntries.length) return "";
  return [...shotEntries].sort(
    (a, b) => parseLocalDate(a.date).getTime() - parseLocalDate(b.date).getTime(),
  )[shotEntries.length - 1]?.date || "";
}

function fmtDate(dateStr: string) {
  const d = parseLocalDate(dateStr);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

function estimateBodyFat(bmi: number, age: number, sex: Sex) {
  if (!bmi || !age) return 0;
  const sexValue = sex === "female" ? 0 : 1;
  return +(1.2 * bmi + 0.23 * age - 10.8 * sexValue - 5.4).toFixed(1);
}

function getIdealWeightRange(heightCm: string) {
  const h = num(heightCm) / 100;
  if (!h) return { low: 0, high: 0 };
  return {
    low: +(18.5 * h * h).toFixed(1),
    high: +(24 * h * h).toFixed(1),
  };
}

function buildMealPlans(
  targetCalories: number,
  appetite?: Appetite,
  cravingLevel?: CravingLevel,
  sideEffect?: SideEffect,
  isELCD?: boolean,
  sex: Sex = "male",
): MealPlan[] {
  const lowAppetite = appetite === "下降";
  const severeCraving = cravingLevel === "高";
  const nausea = sideEffect === "噁心";
  const constipation = sideEffect === "便秘";
  const isFemale = sex === "female";

  if (isELCD) {
    return [
      {
        title: `🔥 ELCD極低熱量日（${isFemale ? "900~1000" : "1000~1100"} kcal）`,
        meals: [
          {
            name: "早餐",
            items: isFemale
              ? ["無糖豆漿 250ml", "水煮蛋 2 顆"]
              : ["無糖豆漿 300ml", "水煮蛋 2 顆"],
          },
          {
            name: "午餐",
            items: isFemale
              ? ["雞胸肉 1.5 掌心", "青菜 2 碗", "清湯"]
              : ["雞胸肉 2 掌心", "青菜 2 碗", "清湯"],
          },
          {
            name: "晚餐",
            items: isFemale
              ? ["嫩豆腐 1 盒", "蒸蛋 1 份", "青菜 2 碗"]
              : ["嫩豆腐 1 盒", "蒸蛋 1 份", "青菜 2 碗", "無糖優格 1 份"],
          },
          {
            name: "加餐",
            items: isFemale
              ? ["茶葉蛋 1 顆", "水 500ml"]
              : ["茶葉蛋 1 顆 / 無糖優格", "水 500ml"],
          },
        ],
      },
      {
        title: `ELCD外食版（${isFemale ? "女性版" : "男性版"}）`,
        meals: [
          { name: "早餐", items: ["茶葉蛋 2 顆", "無糖豆漿"] },
          {
            name: "午餐",
            items: isFemale
              ? ["烤雞便當（去皮）", "飯不吃", "青菜多"]
              : ["烤雞便當（去皮）", "飯不吃", "青菜多", "豆腐或蛋 1 份"],
          },
          { name: "晚餐", items: ["小火鍋（肉+豆腐+青菜）", "不吃主食"] },
          {
            name: "加餐",
            items: isFemale
              ? ["毛豆 / 優格 擇一"]
              : ["毛豆 / 優格 / 茶葉蛋 擇一"],
          },
        ],
      },
    ];
  }

  const calorieTier =
    targetCalories <= 1300
      ? "vlow"
      : targetCalories <= 1500
        ? "low"
        : targetCalories <= 1800
          ? "mid"
          : "high";

  const breakfastMap = {
    vlow: nausea
      ? ["無糖豆漿 250ml", "蘇打餅 2 片", "水煮蛋 1 顆"]
      : ["無糖優格 1 碗", "水煮蛋 2 顆"],
    low: nausea
      ? ["無糖豆漿 250ml", "蘇打餅 2~3 片", "水煮蛋 1 顆"]
      : ["無糖優格 1 碗", "水煮蛋 2 顆", "小香蕉 1 根"],
    mid: nausea
      ? ["無糖豆漿 300ml", "蘇打餅 3~4 片", "水煮蛋 1 顆"]
      : ["無糖優格 1 碗", "水煮蛋 2 顆", "香蕉 1 根", "燕麥半碗"],
    high: nausea
      ? ["無糖豆漿 350ml", "蘇打餅 4 片", "水煮蛋 2 顆"]
      : ["無糖優格 1 碗", "水煮蛋 2 顆", "香蕉 1 根", "燕麥 1 碗"],
  } as const;

  const lunchMap = {
    vlow: severeCraving
      ? ["雞胸肉便當 1 份", "白飯 1/3 碗", "青菜加量", "清湯 1 碗"]
      : ["雞胸/魚肉 1.5 掌心", "糙米飯 1/3 碗", "青菜 2 碗"],
    low: severeCraving
      ? ["雞胸肉便當 1 份", "白飯 1/3~1/2 碗", "青菜加量", "清湯 1 碗"]
      : ["雞胸/魚肉 1.5 掌心", "糙米飯半碗", "青菜 2 碗"],
    mid: severeCraving
      ? ["雞胸肉便當 1 份", "白飯半碗", "青菜加量", "湯 1 碗"]
      : ["雞胸/魚肉 1.5 掌心", "糙米飯半碗到 3/4 碗", "青菜 2 碗"],
    high: severeCraving
      ? ["雞胸肉便當 1 份", "白飯 1 碗", "青菜加量", "湯 1 碗"]
      : ["雞胸/魚肉 2 掌心", "糙米飯 1 碗", "青菜 2 碗"],
  } as const;

  const dinnerMap = {
    vlow: lowAppetite
      ? ["蒸蛋 1 份", "嫩豆腐 1 盒", "青菜 2 碗"]
      : ["瘦肉/魚肉 1 掌心", "菇類與青菜 2 碗", "地瓜半條"],
    low: lowAppetite
      ? ["蒸蛋 1 份", "嫩豆腐 1 盒", "青菜 2 碗", "地瓜半條"]
      : ["瘦肉/魚肉 1 掌心", "菇類與青菜 2 碗", "地瓜半條到 1 小條"],
    mid: lowAppetite
      ? ["蒸蛋 1 份", "嫩豆腐 1 盒", "青菜 2 碗", "地瓜半條"]
      : ["瘦肉/魚肉 1 掌心", "菇類與青菜 2 碗", "地瓜 1 小條"],
    high: lowAppetite
      ? ["蒸蛋 1 份", "嫩豆腐 1 盒", "青菜 2 碗", "地瓜 1 條"]
      : ["瘦肉/魚肉 1.5 掌心", "菇類與青菜 2 碗", "地瓜 1 條"],
  } as const;

  const snackMap = {
    vlow: constipation
      ? ["奇異果 1 顆", "水 500ml"]
      : severeCraving
        ? ["茶葉蛋 1 顆"]
        : ["無糖優格或毛豆 1 份"],
    low: constipation
      ? ["奇異果 1 顆", "毛豆 1 份", "水 500ml"]
      : severeCraving
        ? ["茶葉蛋 1 顆", "無糖豆漿 1 瓶"]
        : ["茶葉蛋 1 顆", "無糖優格或毛豆 1 份"],
    mid: constipation
      ? ["奇異果 1 顆", "毛豆 1 份", "水 500ml"]
      : severeCraving
        ? ["茶葉蛋 2 顆", "無糖豆漿 1 瓶", "堅果 1 小把"]
        : ["茶葉蛋 1 顆", "無糖優格或毛豆 1 份"],
    high: constipation
      ? ["奇異果 2 顆", "毛豆 1 份", "水 500ml"]
      : severeCraving
        ? ["茶葉蛋 2 顆", "無糖豆漿 1 瓶", "堅果 1 小把", "水果 1 份"]
        : ["茶葉蛋 2 顆", "無糖優格 1 份", "毛豆 1 份"],
  } as const;

  const sexAdjust = (items: readonly string[]) => {
    if (isFemale) return [...items, "份量以女性版為準：主食與加餐較精簡"];
    return [...items, "份量以男性版為準：蛋白質與主食較足"];
  };

  return [
    {
      title: `精準菜單 A（${Math.max(
        isFemale ? 1000 : 1200,
        targetCalories - 100,
      )}~${targetCalories + 100} kcal｜${isFemale ? "女性版" : "男性版"}）`,
      meals: [
        { name: "早餐", items: sexAdjust(breakfastMap[calorieTier]) },
        { name: "午餐", items: sexAdjust(lunchMap[calorieTier]) },
        { name: "晚餐", items: sexAdjust(dinnerMap[calorieTier]) },
        { name: "加餐", items: sexAdjust(snackMap[calorieTier]) },
      ],
    },
    {
      title: `外食版菜單 B（${isFemale ? "女性版" : "男性版"}）`,
      meals: [
        {
          name: "早餐",
          items:
            calorieTier === "high"
              ? isFemale
                ? ["茶葉蛋 2 顆", "無糖豆漿 1 瓶"]
                : ["茶葉蛋 2 顆", "無糖豆漿 1 瓶", "地瓜 1 條"]
              : isFemale
                ? ["茶葉蛋 1~2 顆", "無糖豆漿 1 瓶"]
                : ["茶葉蛋 2 顆", "無糖豆漿 1 瓶"],
        },
        {
          name: "午餐",
          items:
            calorieTier === "vlow"
              ? isFemale
                ? ["便當選烤雞/滷雞腿", "飯 1/3 碗", "青菜加量"]
                : ["便當選烤雞/滷雞腿", "飯半碗以下", "青菜加量"]
              : calorieTier === "low"
                ? isFemale
                  ? ["便當選烤雞/滷雞腿", "飯 1/3~1/2 碗", "青菜加量"]
                  : ["便當選烤雞/滷雞腿", "飯半碗以下", "青菜加量"]
                : calorieTier === "mid"
                  ? isFemale
                    ? ["便當選烤雞/滷雞腿", "飯半碗", "青菜加量"]
                    : ["便當選烤雞/滷雞腿", "飯半碗到 3/4 碗", "青菜加量"]
                  : isFemale
                    ? ["便當選烤雞/滷雞腿", "飯 1/2~3/4 碗", "青菜加量"]
                    : ["便當選烤雞/滷雞腿", "飯 3/4~1 碗", "青菜加量"],
        },
        {
          name: "晚餐",
          items:
            calorieTier === "high"
              ? isFemale
                ? ["小火鍋選肉片+豆腐+青菜", "主食半份"]
                : ["小火鍋選肉片+豆腐+青菜", "主食半份到 1 份"]
              : [
                  "小火鍋選肉片+豆腐+青菜",
                  isFemale ? "主食 1/3~1/2 份" : "主食半份",
                ],
        },
        {
          name: "加餐",
          items:
            calorieTier === "high"
              ? isFemale
                ? ["毛豆/優格/蛋白飲 擇一"]
                : ["毛豆/優格/蛋白飲 二選一"]
              : isFemale
                ? ["毛豆/優格/蛋白飲 擇一"]
                : ["毛豆/優格/蛋白飲 三選一"],
        },
      ],
    },
  ];
}

function getShotCycleDay(latestShotDate: string, currentDate: string) {
  if (!latestShotDate) return 0;
  const diff = daysBetween(latestShotDate, currentDate);
  if (diff < 0) return 0;
  return diff + 1;
}

function getSevenDayAverage(entries: Entry[], index: number) {
  const slice = entries.slice(Math.max(0, index - 6), index + 1);
  const values = slice.map((e) => num(e.weight)).filter((v) => v > 0);
  if (!values.length) return 0;
  return +(values.reduce((sum, v) => sum + v, 0) / values.length).toFixed(1);
}

function downloadTextFile(filename: string, content: string) {
  if (typeof window === "undefined") return;
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("讀取圖片失敗"));
    reader.readAsDataURL(file);
  });
}

function estimateETA(latestWeight: number, goalWeight: number, weeklyLoss: number) {
  if (!latestWeight || !goalWeight || weeklyLoss <= 0) {
    return { weeks: 0, date: "-", text: "資料不足" };
  }
  const remain = latestWeight - goalWeight;
  if (remain <= 0) {
    return { weeks: 0, date: "已達成", text: "已達目標" };
  }
  const weeks = Math.ceil(remain / weeklyLoss);
  const today = new Date();
  const eta = new Date(today);
  eta.setDate(eta.getDate() + weeks * 7);
  const dateStr = `${eta.getFullYear()}/${eta.getMonth() + 1}/${eta.getDate()}`;
  let text = `約 ${weeks} 週後（${dateStr}）`;
  if (weeklyLoss > 1.2) text += " · 速度偏快，注意肌肉流失";
  if (weeklyLoss < 0.3) text += " · 速度偏慢，可能需要調整";
  return { weeks, date: dateStr, text };
}

export default function SimpleTracker() {
  const [mounted, setMounted] = useState(false);
  const [today, setToday] = useState("");
  const [notificationPermission, setNotificationPermission] = useState<
    NotificationPermission | "default" | "unsupported"
  >("default");

  const defaultSettings: Settings = {
    firstShotDate: today || "2026-01-01",
    notificationsOn: true,
    elcdMode: false,
    height: "173",
    age: "35",
    goal: "90",
    sex: "male",
    activity: "1.2",
    shotInterval: "7",
    remindOneDayBefore: true,
    remindOnShotDay: true,
    remindIfNoLogByNight: false,
    waterReminder: false,
    proteinReminder: false,
  };

  const [entries, setEntries] = useState<Entry[]>([]);
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [tempSettings, setTempSettings] = useState<Settings>(defaultSettings);

  const [form, setForm] = useState<Omit<Entry, "id">>({
    date: "",
    weight: "",
    dose: "2.5",
    appetite: "正常",
    cravingLevel: "中",
    sideEffect: "無",
    sideEffectSeverity: "0",
    sideEffects: [{ effect: "無", severity: "0" }],
    exerciseMin: "0",
    isShotDay: false,
  });

  const [editingId, setEditingId] = useState<string | null>(null);
  const [penStrength, setPenStrength] = useState("10");
  const [targetDose, setTargetDose] = useState("2.5");
  const [penInventory, setPenInventory] = useState<PenInventory>({
    penStrength: "10",
    totalPens: "1",
    usedGrids: "0",
  });
  const [photoRecords, setPhotoRecords] = useState<PhotoRecord[]>([]);
  const [photoDate, setPhotoDate] = useState("");
  const [photoNote, setPhotoNote] = useState("");

  const penQuickPresets = [
    { label: "10 → 2.5", strength: "10", dose: "2.5" },
    { label: "10 → 5", strength: "10", dose: "5" },
    { label: "12.5 → 5", strength: "12.5", dose: "5" },
    { label: "12.5 → 7.5", strength: "12.5", dose: "7.5" },
    { label: "15 → 5", strength: "15", dose: "5" },
    { label: "15 → 7.5", strength: "15", dose: "7.5" },
    { label: "15 → 10", strength: "15", dose: "10" },
    { label: "15 → 12.5", strength: "15", dose: "12.5" },
  ] as const;

  useEffect(() => {
    setMounted(true);
    const localToday = getTodayLocalDate();
    setToday(localToday);

    if (typeof window !== "undefined" && "Notification" in window) {
      setNotificationPermission(Notification.permission);
    } else {
      setNotificationPermission("unsupported");
    }
  }, []);

  useEffect(() => {
    if (!today) return;

    const data = localStorage.getItem(STORAGE_KEY);
    const settingsData = localStorage.getItem(SETTINGS_KEY);
    const penInventoryData = localStorage.getItem(PEN_INVENTORY_KEY);
    const photoRecordsData = localStorage.getItem(PHOTO_RECORDS_KEY);

    if (data) {
      try {
        const parsed = JSON.parse(data);
        const normalized: Entry[] = Array.isArray(parsed)
          ? parsed.map((item, index) => {
              const legacySideEffect = (item?.sideEffect || "無") as SideEffect;
              const legacySeverity =
                item?.sideEffectSeverity ||
                (item?.sideEffect && item?.sideEffect !== "無" ? "2" : "0");

              const normalizedSideEffects: SideEffectItem[] =
                Array.isArray(item?.sideEffects) && item.sideEffects.length
                  ? item.sideEffects.map((se: any) => ({
                      effect: (se?.effect || "無") as SideEffect,
                      severity: String(se?.severity || "0"),
                    }))
                  : [{ effect: legacySideEffect, severity: String(legacySeverity) }];

              const firstActive =
                normalizedSideEffects.find((se) => se.effect !== "無") || normalizedSideEffects[0];

              return {
                id:
                  item?.id ||
                  `legacy-${item?.date || "item"}-${index}-${Math.random()
                    .toString(36)
                    .slice(2, 8)}`,
                date: item?.date || today,
                weight: item?.weight || "",
                dose: item?.dose || "2.5",
                appetite: item?.appetite || "正常",
                cravingLevel: item?.cravingLevel || "中",
                sideEffect: (firstActive?.effect || "無") as SideEffect,
                sideEffectSeverity: String(firstActive?.severity || "0"),
                sideEffects: normalizedSideEffects,
                exerciseMin: item?.exerciseMin || "0",
                isShotDay: Boolean(item?.isShotDay),
              };
            })
          : [];
        setEntries(normalized);
      } catch {
        setEntries([]);
      }
    }

    const freshDefaults: Settings = { ...defaultSettings, firstShotDate: today };

    if (settingsData) {
      try {
        const parsed = { ...freshDefaults, ...JSON.parse(settingsData) };
        setSettings(parsed);
        setTempSettings(parsed);
      } catch {
        setSettings(freshDefaults);
        setTempSettings(freshDefaults);
      }
    } else {
      setSettings(freshDefaults);
      setTempSettings(freshDefaults);
    }

    if (penInventoryData) {
      try {
        setPenInventory((prev) => ({ ...prev, ...JSON.parse(penInventoryData) }));
      } catch {
        // ignore
      }
    }

    if (photoRecordsData) {
      try {
        const parsed = JSON.parse(photoRecordsData);
        setPhotoRecords(Array.isArray(parsed) ? parsed : []);
      } catch {
        // ignore
      }
    }

    setForm((prev) => ({
      ...prev,
      date: today,
    }));
    setPhotoDate(today);
  }, [today]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  }, []);

  useEffect(() => {
    if (!mounted) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  }, [entries, mounted]);

  useEffect(() => {
    if (!mounted) return;
    localStorage.setItem(PEN_INVENTORY_KEY, JSON.stringify(penInventory));
  }, [penInventory, mounted]);

  useEffect(() => {
    if (!mounted) return;
    localStorage.setItem(PHOTO_RECORDS_KEY, JSON.stringify(photoRecords));
  }, [photoRecords, mounted]);

  const sortedEntries = useMemo(() => {
    return [...entries].sort(
      (a, b) => parseLocalDate(a.date).getTime() - parseLocalDate(b.date).getTime(),
    );
  }, [entries]);

  const latest = sortedEntries.length ? sortedEntries[sortedEntries.length - 1] : null;

  const latestWeight = latest ? num(latest.weight) : 0;
  const bmi = getBMI(num(settings.height), latestWeight);
  const bmiLabel = getBMILabel(bmi);
  const bmr = getBMR(latestWeight, num(settings.height), num(settings.age), settings.sex);
  const tdee = bmr ? Math.round(bmr * num(settings.activity || 1.2)) : 0;

  let minCalories = 0;
  if (settings.sex === "female") {
    minCalories = latestWeight <= 60 ? 1000 : 1100;
  } else {
    minCalories = latestWeight <= 80 ? 1200 : 1300;
  }

  let cutCalories = tdee ? Math.max(minCalories, tdee - 500) : 0;
  const bodyFat = estimateBodyFat(bmi, num(settings.age), settings.sex);
  const idealRange = getIdealWeightRange(settings.height);

  const weeklyLoss = useMemo(() => {
    if (sortedEntries.length < 2) return 0;
    const first = sortedEntries[0];
    const last = sortedEntries[sortedEntries.length - 1];
    const days = daysBetween(first.date, last.date);
    if (!days) return 0;
    return +(((num(first.weight) - num(last.weight)) / days) * 7).toFixed(2);
  }, [sortedEntries]);

  const recent7Delta = useMemo(() => {
    if (sortedEntries.length < 2) return 0;
    const last = sortedEntries[sortedEntries.length - 1];
    const recent = sortedEntries.filter((e) => {
      const d = daysBetween(e.date, last.date);
      return d <= 7 && d >= 0;
    });
    if (recent.length < 2) return 0;
    return +(num(recent[0].weight) - num(recent[recent.length - 1].weight)).toFixed(1);
  }, [sortedEntries]);

  const latestShotDate = useMemo(() => {
    return getLatestShotDate(sortedEntries);
  }, [sortedEntries]);

  const shotEntries = useMemo(() => {
    return [...sortedEntries].filter((entry) => entry.isShotDay).reverse();
  }, [sortedEntries]);

  const nextShot = useMemo(() => {
    const recordBaseDate = latestShotDate;
    const fallbackBaseDate = settings.firstShotDate;
    const baseDate = recordBaseDate || fallbackBaseDate;
    if (!baseDate || !today) {
      return { text: "-", date: "-", shouldNotify: false, baseDate: "-", source: "未設定" };
    }

    const interval = Math.max(1, num(settings.shotInterval || 7));
    const nextDate = getNextShotDate(baseDate, interval, today);
    const diff = nextDate ? daysBetween(today, nextDate) : 0;

    return {
      date: nextDate || "-",
      text: diff > 0 ? `${diff} 天後` : diff === 0 ? "今天" : `已過 ${Math.abs(diff)} 天`,
      shouldNotify: settings.notificationsOn && diff <= 1,
      baseDate,
      source: recordBaseDate ? "最近一次施打日紀錄" : "首次施打日期",
    };
  }, [latestShotDate, settings.firstShotDate, today, settings.shotInterval, settings.notificationsOn]);

  const previewNextShot = useMemo(() => {
    const recordBaseDate = latestShotDate;
    const fallbackBaseDate = tempSettings.firstShotDate;
    const baseDate = recordBaseDate || fallbackBaseDate;
    if (!baseDate || !today) {
      return { date: "-", text: "請先設定首次施打日期", baseDate: "-", source: "未設定" };
    }

    const interval = Math.max(1, num(tempSettings.shotInterval || 7));
    const nextDate = getNextShotDate(baseDate, interval, today);
    const diff = nextDate ? daysBetween(today, nextDate) : 0;

    return {
      date: nextDate || "-",
      text: diff > 0 ? `${diff} 天後` : diff === 0 ? "今天" : `已過 ${Math.abs(diff)} 天`,
      baseDate,
      source: recordBaseDate ? "最近一次施打日紀錄" : "首次施打日期",
    };
  }, [latestShotDate, tempSettings.firstShotDate, tempSettings.shotInterval, today]);

  const shotCycleDay = useMemo(() => {
    return latestShotDate && today ? getShotCycleDay(latestShotDate, today) : 0;
  }, [latestShotDate, today]);

  const shotStatus = useMemo(() => {
    if (!nextShot.date || nextShot.date === "-") {
      return { status: "尚未建立", text: "請先建立施打日", overdueDays: 0 };
    }
    const diff = today ? daysBetween(today, nextShot.date) : 0;
    if (diff > 0) {
      return { status: "本週尚未施打", text: `距離下次施打還有 ${diff} 天`, overdueDays: 0 };
    }
    if (diff === 0) {
      return { status: "今天該施打", text: "今天是施打日", overdueDays: 0 };
    }
    return {
      status: "可能漏打",
      text: `已超過 ${Math.abs(diff)} 天，可補打後重設基準`,
      overdueDays: Math.abs(diff),
    };
  }, [nextShot.date, today]);

  const progress = useMemo(() => {
    const goal = num(settings.goal);
    if (!latestWeight || !goal || !sortedEntries.length) return 0;
    const start = num(sortedEntries[0].weight);
    const totalNeed = start - goal;
    const done = start - latestWeight;
    if (totalNeed <= 0) return 0;
    return Math.max(0, Math.min(100, Math.round((done / totalNeed) * 100)));
  }, [settings.goal, latestWeight, sortedEntries]);

  const plateau = useMemo(() => {
    if (sortedEntries.length < 3) return { isPlateau: false, text: "資料不足" };
    const last = sortedEntries[sortedEntries.length - 1];
    const recent = sortedEntries.filter((e) => {
      const d = daysBetween(e.date, last.date);
      return d <= 14 && d >= 0;
    });
    if (recent.length < 2) return { isPlateau: false, text: "資料不足" };
    const delta = Math.abs(num(recent[0].weight) - num(recent[recent.length - 1].weight));
    if (delta <= 0.3) {
      return { isPlateau: true, text: "近 2 週體重變化很小，可能進入停滯期" };
    }
    return { isPlateau: false, text: "目前未見明顯停滯" };
  }, [sortedEntries]);

  const bingeRisk = useMemo(() => {
    if (!latest) return { level: "-", text: "尚無資料" };
    let score = 0;
    if (latest.cravingLevel === "高") score += 2;
    if (latest.appetite === "偏餓") score += 1;
    if (latest.sideEffect === "無") score += 1;
    if (num(latest.exerciseMin) === 0) score += 1;
    if (score >= 4) {
      return { level: "高", text: "今天暴食/亂吃風險偏高，先備好蛋白質加餐" };
    }
    if (score >= 2) {
      return { level: "中", text: "有嘴饞風險，先準備低熱量高蛋白替代品" };
    }
    return { level: "低", text: "目前飲食失控風險較低" };
  }, [latest]);

  const waterVsFat = useMemo(() => {
    if (sortedEntries.length < 2) return "資料不足";
    const first = sortedEntries[0];
    const last = sortedEntries[sortedEntries.length - 1];
    const days = Math.max(1, daysBetween(first.date, last.date));
    const totalLoss = num(first.weight) - num(last.weight);
    if (days <= 10 && totalLoss >= 2) return "前期下降偏快，較可能包含較多水分變化";
    if (weeklyLoss >= 1.2) return "下降速度偏快，可能水分與脂肪都有";
    if (weeklyLoss > 0 && weeklyLoss <= 1) return "目前節奏較像穩定脂肪下降";
    return "先持續觀察 1~2 週再判斷";
  }, [sortedEntries, weeklyLoss]);

  const strategyMode = useMemo(() => {
    if (!latest) return ["先建立第一筆紀錄"];
    const tips: string[] = [];
    if (latest.cravingLevel === "高") {
      tips.push("今天把餅乾、甜食移出視線，先準備茶葉蛋、毛豆、無糖豆漿");
    }
    if (latest.appetite === "下降") {
      tips.push("食量小時改少量多餐，優先蛋白質與水分");
    }
    if (latest.sideEffect === "噁心") {
      tips.push("避免油膩與大份量，改清淡小餐");
    }
    if (latest.sideEffect === "便秘") {
      tips.push("今天多喝水，加奇異果、蔬菜、毛豆");
    }
    if (weeklyLoss < 0.3 && sortedEntries.length >= 3) {
      tips.push("減重偏慢，可先檢查飲料、零食與隱藏熱量");
    }
    if (!tips.length) {
      tips.push("維持目前節奏，繼續固定施打與記錄體重");
    }
    return tips;
  }, [latest, weeklyLoss, sortedEntries.length]);

  const elcdStatus = useMemo(() => {
    if (!settings.elcdMode) {
      return { enabled: false, score: 0, reasons: ["極低熱量模式未開啟"] };
    }
    if (!latest || sortedEntries.length < 3) {
      return { enabled: false, score: 0, reasons: ["資料不足，至少需要 3 筆紀錄"] };
    }

    let score = 0;
    const reasons: string[] = [];

    if (plateau.isPlateau) {
      score += 3;
      reasons.push("近兩週可能停滯");
    }
    if (weeklyLoss < 0.3) {
      score += 2;
      reasons.push("每週下降偏慢");
    }
    if (latest.appetite === "下降") {
      score += 2;
      reasons.push("目前食慾下降，較適合低熱量日");
    }
    if (num(latest.exerciseMin) >= 20) {
      score += 1;
      reasons.push("近期有基本活動量");
    }
    if (latest.cravingLevel === "高") {
      score -= 3;
      reasons.push("嘴饞高，避免低熱量後暴食");
    }
    if (latest.sideEffect !== "無") {
      score -= 2;
      reasons.push("有副作用，先以舒適度優先");
    }

    return {
      enabled: score >= 3,
      score,
      reasons: reasons.length ? reasons : ["目前沒有明確啟動條件"],
    };
  }, [settings.elcdMode, latest, sortedEntries, plateau, weeklyLoss]);

  const isELCDDay = elcdStatus.enabled;

  if (settings.elcdMode && latest && isELCDDay) {
    cutCalories = Math.max(900, cutCalories - 400);
  }

  const mealPlans = useMemo(() => {
    return buildMealPlans(
      cutCalories,
      latest?.appetite,
      latest?.cravingLevel,
      latest?.sideEffect,
      isELCDDay,
      settings.sex,
    );
  }, [cutCalories, latest, isELCDDay, settings.sex]);

  const calorieAdvice = useMemo(() => {
    if (!bmr || !tdee || !cutCalories) {
      return {
        base: "資料不足",
        target: "資料不足",
        note: "先完成身高、年齡、性別、體重設定",
      };
    }

    const sexLabel = settings.sex === "female" ? "女性" : "男性";
    return {
      base: `${sexLabel}基礎代謝約 ${bmr} kcal`,
      target: `建議減脂熱量約 ${cutCalories} kcal/天`,
      note:
        settings.sex === "female"
          ? "女性版菜單會把基準熱量抓得更保守，份量通常比男性版略少。"
          : "男性版菜單會依較高熱量需求，保留較足夠的蛋白質與主食份量。",
    };
  }, [bmr, tdee, cutCalories, settings.sex]);

  const cheatDecision = useMemo(() => {
    if (!latest || sortedEntries.length < 3) {
      return { level: "-", reason: "資料不足", plan: [] as string[] };
    }

    let score = 0;
    if (plateau.isPlateau) score += 3;
    if (weeklyLoss < 0.3) score += 2;
    if (latest.cravingLevel === "高") score += 2;
    if (latest.appetite === "偏餓") score += 1;
    if (latest.sideEffect === "無" && latest.cravingLevel === "高") score += 1;

    if (score >= 6) {
      return {
        level: "建議放鬆一餐",
        reason: "停滯+高壓+高嘴饞",
        plan: [
          "優先蛋白質：燒肉/牛排/雞腿",
          "碳水可吃：飯1碗或漢堡1個",
          "避免：甜點+含糖飲料",
          "一餐結束，不延續下一餐",
        ],
      };
    }

    if (score >= 3) {
      return {
        level: "可控放鬆",
        reason: "有嘴饞或減重趨緩",
        plan: [
          "炸物可吃但減半",
          "可樂改零卡",
          "先吃蛋白質再吃其他",
          "總量控制在TDEE內",
        ],
      };
    }

    return {
      level: "不建議",
      reason: "目前減脂順利",
      plan: ["維持現在飲食", "嘴饞用蛋白質替代", "避免高熱量誘惑"],
    };
  }, [latest, sortedEntries, plateau, weeklyLoss]);

  const doseAI = useMemo(() => {
    if (!latest || sortedEntries.length < 3) {
      return { level: "-", reason: "資料不足", action: "先持續觀察" };
    }

    const currentDose = num(latest.dose);
    let score = 0;
    if (weeklyLoss < 0.3) score += 2;
    if (plateau.isPlateau) score += 3;
    if (latest.appetite === "偏餓") score += 2;
    if (latest.cravingLevel === "高") score += 1;
    if (weeklyLoss > 1.2) score -= 2;

    if (score >= 5) {
      return {
        level: "建議升劑量",
        reason: "效果不足或出現停滯",
        action: `${currentDose} → ${currentDose + 2.5} mg`,
      };
    }

    if (score >= 2) {
      return {
        level: "可考慮升劑量",
        reason: "效果略下降",
        action: "觀察1~2週後決定",
      };
    }

    if (weeklyLoss > 1.2) {
      return {
        level: "不建議升",
        reason: "下降過快",
        action: "維持或甚至減量",
      };
    }

    return {
      level: "維持劑量",
      reason: "目前效果良好",
      action: `${currentDose} mg 持續`,
    };
  }, [latest, weeklyLoss, plateau, sortedEntries]);

  const cravingTips = useMemo(() => {
    const base = [
      "先喝 300~500ml 水或無糖茶，再等 10 分鐘",
      "先吃蛋白質：茶葉蛋、豆腐、毛豆、無糖優格",
      "不要空腹直接碰餅乾、洋芋片、甜點",
      "嘴饞時改吃有咀嚼感的低熱量食物",
    ];
    if (latest?.cravingLevel === "高") {
      base.unshift("今天先把零食收起來，只留計畫內加餐");
    }
    return base;
  }, [latest]);

  const personalAI = useMemo(() => {
    if (sortedEntries.length < 5) {
      return {
        summary: "資料還不夠，累積 5 筆以上會開始學你的模式",
        bestWindow: "-",
        riskWindow: "-",
        effectivePattern: "-",
        learningTips: ["先持續記錄體重、食慾、嘴饞、運動時間"],
      };
    }

    const appetiteCounts: Record<string, number> = {};
    const cravingCounts: Record<string, number> = {};
    const exerciseBuckets: Record<string, number> = {
      "0": 0,
      "1-20": 0,
      "21-40": 0,
      "41+": 0,
    };

    let lowCravingLossDays = 0;
    let highCravingDays = 0;
    let hungryDays = 0;
    let appetiteDownDays = 0;

    sortedEntries.forEach((e, idx) => {
      appetiteCounts[e.appetite] = (appetiteCounts[e.appetite] || 0) + 1;
      cravingCounts[e.cravingLevel] = (cravingCounts[e.cravingLevel] || 0) + 1;

      const ex = num(e.exerciseMin);
      if (ex === 0) exerciseBuckets["0"] += 1;
      else if (ex <= 20) exerciseBuckets["1-20"] += 1;
      else if (ex <= 40) exerciseBuckets["21-40"] += 1;
      else exerciseBuckets["41+"] += 1;

      if (e.cravingLevel === "高") highCravingDays += 1;
      if (e.appetite === "偏餓") hungryDays += 1;
      if (e.appetite === "下降") appetiteDownDays += 1;

      if (idx > 0) {
        const prev = sortedEntries[idx - 1];
        const delta = num(prev.weight) - num(e.weight);
        if (delta > 0 && e.cravingLevel !== "高") lowCravingLossDays += 1;
      }
    });

    const appetiteTop =
      Object.entries(appetiteCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "正常";
    const cravingTop =
      Object.entries(cravingCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "中";
    const exerciseTop =
      Object.entries(exerciseBuckets).sort((a, b) => b[1] - a[1])[0]?.[0] || "0";

    let effectivePattern = "維持目前節奏";
    if (
      exerciseBuckets["21-40"] + exerciseBuckets["41+"] >=
      Math.ceil(sortedEntries.length / 3)
    ) {
      effectivePattern = "你在有規律活動（尤其 20 分鐘以上）時，較容易維持穩定下降";
    } else if (appetiteDownDays >= Math.ceil(sortedEntries.length / 3)) {
      effectivePattern = "你在食慾下降的日子更容易守住熱量，這段時間最適合吃乾淨一點";
    } else if (lowCravingLossDays >= Math.ceil((sortedEntries.length - 1) / 2)) {
      effectivePattern = "你在嘴饞不高時，體重下降通常更順，控制零食對你特別重要";
    }

    let riskWindow = "嘴饞高的日子";
    if (hungryDays > highCravingDays) riskWindow = "食慾偏餓的日子";
    if (exerciseBuckets["0"] >= Math.ceil(sortedEntries.length / 2)) {
      riskWindow += " + 沒運動時";
    }

    let bestWindow = "食慾穩定且運動 20 分鐘以上時";
    if (appetiteTop === "下降") {
      bestWindow = "施打後食慾下降的幾天";
    } else if (exerciseTop === "21-40" || exerciseTop === "41+") {
      bestWindow = "有做 20 分鐘以上活動的日子";
    }

    const learningTips = [
      `你最常見的食慾狀態是「${appetiteTop}」`,
      `你最常見的嘴饞程度是「${cravingTop}」`,
      effectivePattern,
      `你較容易失守的情境是：${riskWindow}`,
      `你較容易成功的情境是：${bestWindow}`,
    ];

    return {
      summary: "AI 已開始根據你的歷史紀錄學習個人模式",
      bestWindow,
      riskWindow,
      effectivePattern,
      learningTips,
    };
  }, [sortedEntries]);

  const currentDoseSeries = useMemo(() => {
    const orderedShotEntries = [...shotEntries].reverse();
    if (!orderedShotEntries.length) return { dose: "-", shotCount: 0, weeks: 0 };
    const latestShot = orderedShotEntries[orderedShotEntries.length - 1];
    let count = 0;
    for (let i = orderedShotEntries.length - 1; i >= 0; i -= 1) {
      if (orderedShotEntries[i].dose === latestShot.dose) count += 1;
      else break;
    }
    return { dose: latestShot.dose, shotCount: count, weeks: count };
  }, [shotEntries]);

  const doseEscalationPlan = useMemo(() => {
    if (!shotEntries.length) {
      return {
        title: "尚無施打紀錄",
        subtitle: "先累積施打紀錄後，系統才會判斷是否適合升階",
        nextDose: "-",
        ready: false,
      };
    }

    const currentDose = num(currentDoseSeries.dose);
    const sideEffectHeavy =
      latest && latest.sideEffect !== "無" && num(latest.sideEffectSeverity) >= 3;
    const poorResponse =
      plateau.isPlateau ||
      weeklyLoss < 0.3 ||
      latest?.appetite === "偏餓" ||
      latest?.cravingLevel === "高";
    const maxDoseReached = currentDose >= 15;
    const ready =
      currentDoseSeries.shotCount >= 4 &&
      poorResponse &&
      !sideEffectHeavy &&
      !maxDoseReached;

    if (maxDoseReached) {
      return {
        title: "已在最高常見劑量區間",
        subtitle: `目前連續 ${currentDoseSeries.shotCount} 針為 ${currentDoseSeries.dose} mg，先觀察飲食與副作用。`,
        nextDose: `${currentDoseSeries.dose} mg`,
        ready: false,
      };
    }

    if (ready) {
      return {
        title: "可考慮升階",
        subtitle: `目前 ${currentDoseSeries.dose} mg 已連續 ${currentDoseSeries.shotCount} 針，且效果偏弱。`,
        nextDose: `${currentDose + 2.5} mg`,
        ready: true,
      };
    }

    if (currentDoseSeries.shotCount < 4) {
      return {
        title: "建議先打滿 4 針再評估",
        subtitle: `目前 ${currentDoseSeries.dose} mg 已打 ${currentDoseSeries.shotCount} 針。`,
        nextDose: `${currentDose + 2.5} mg`,
        ready: false,
      };
    }

    if (sideEffectHeavy) {
      return {
        title: "先不要升階",
        subtitle: "最近副作用偏明顯，先穩定再評估。",
        nextDose: `${currentDoseSeries.dose} mg`,
        ready: false,
      };
    }

    return {
      title: "目前先維持",
      subtitle: `目前 ${currentDoseSeries.dose} mg 已連續 ${currentDoseSeries.shotCount} 針，效果尚可。`,
      nextDose: `${currentDoseSeries.dose} mg`,
      ready: false,
    };
  }, [shotEntries, currentDoseSeries, plateau.isPlateau, weeklyLoss, latest]);

  const penInventorySummary = useMemo(() => {
    const strength = Math.max(0, num(penInventory.penStrength));
    const totalPens = Math.max(0, num(penInventory.totalPens));
    const totalGrids = totalPens * 60;
    const usedGrids = Math.max(0, num(penInventory.usedGrids));
    const remainGrids = Math.max(0, totalGrids - usedGrids);
    const remainMg = strength ? +((remainGrids / 60) * strength).toFixed(2) : 0;
    const latestDose = Math.max(0, num(latest?.dose));
    const shotsLeft = latestDose ? Math.floor(remainMg / latestDose) : 0;
    return { strength, totalPens, totalGrids, usedGrids, remainGrids, remainMg, shotsLeft };
  }, [penInventory, latest]);

  const chartData = sortedEntries.map((e, i) => ({
    i: i + 1,
    date: fmtDate(e.date),
    weight: num(e.weight),
    avg7: getSevenDayAverage(sortedEntries, i),
    goal: num(settings.goal) || null,
  }));

  const shotPattern = useMemo(() => {
    if (!latestShotDate || !sortedEntries.length) {
      return {
        currentDay: 0,
        appetiteText: "資料不足",
        cravingText: "資料不足",
        sideEffectText: "資料不足",
      };
    }
    const tagged = sortedEntries
      .map((entry) => ({
        ...entry,
        dayAfterShot: latestShotDate ? getShotCycleDay(latestShotDate, entry.date) : 0,
      }))
      .filter(
        (entry) =>
          entry.dayAfterShot >= 1 &&
          entry.dayAfterShot <= Math.max(7, num(settings.shotInterval || 7)),
      );
    const appetiteLow = tagged
      .filter((e) => e.appetite === "下降")
      .map((e) => e.dayAfterShot);
    const cravingHigh = tagged
      .filter((e) => e.cravingLevel === "高")
      .map((e) => e.dayAfterShot);
    const sideEffects = tagged
      .filter((e) => e.sideEffect !== "無")
      .map((e) => e.dayAfterShot);
    const avgText = (values: number[], fallback: string) =>
      values.length
        ? `多半落在施打後第 ${Math.round(
            values.reduce((a, b) => a + b, 0) / values.length,
          )} 天`
        : fallback;

    return {
      currentDay: shotCycleDay,
      appetiteText: avgText(appetiteLow, "尚未看出明顯低食慾日"),
      cravingText: avgText(cravingHigh, "尚未看出固定高嘴饞日"),
      sideEffectText: avgText(sideEffects, "尚未看出固定副作用日"),
    };
  }, [latestShotDate, sortedEntries, settings.shotInterval, shotCycleDay]);

  const sideEffectInsight = useMemo(() => {
    const effected = sortedEntries.filter((e) => e.sideEffect !== "無");
    if (!effected.length) {
      return { top: "目前無明顯副作用", severity: "0", text: "繼續觀察" };
    }
    const counts: Record<string, number> = {};
    effected.forEach((e) => {
      counts[e.sideEffect] = (counts[e.sideEffect] || 0) + 1;
    });
    const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || "無";
    const avgSeverity = +(
      effected.reduce((sum, e) => sum + num(e.sideEffectSeverity), 0) / effected.length
    ).toFixed(1);
    return {
      top,
      severity: String(avgSeverity),
      text: `最常見副作用為 ${top}，平均嚴重度 ${avgSeverity}/5`,
    };
  }, [sortedEntries]);

  const penCalc = useMemo(() => {
    const strength = Math.max(0, num(penStrength));
    const dose = Math.max(0, num(targetDose));
    const valid = strength > 0 && dose > 0 && dose <= strength;
    const ratio = valid ? dose / strength : 0;

    return {
      valid,
      clicks: Math.round(60 * ratio),
      ratio: +(ratio * 100).toFixed(1),
      remainClicks: Math.max(0, 60 - Math.round(60 * ratio)),
    };
  }, [penStrength, targetDose]);

  const eta = useMemo(() => {
    return estimateETA(latestWeight, num(settings.goal), weeklyLoss);
  }, [latestWeight, settings.goal, weeklyLoss]);


  const addSideEffectField = () => {
    setForm((prev) => ({
      ...prev,
      sideEffects: [...prev.sideEffects, { effect: "無", severity: "0" }],
    }));
  };

  const updateSideEffectField = (
    index: number,
    field: "effect" | "severity",
    value: string,
  ) => {
    setForm((prev) => {
      const nextSideEffects = prev.sideEffects.map((item, i) =>
        i === index ? { ...item, [field]: value } : item,
      );

      const firstActive =
        nextSideEffects.find((item) => item.effect !== "無") || nextSideEffects[0];

      return {
        ...prev,
        sideEffects: nextSideEffects,
        sideEffect: (firstActive?.effect || "無") as SideEffect,
        sideEffectSeverity: String(firstActive?.severity || "0"),
      };
    });
  };

  const removeSideEffectField = (index: number) => {
    setForm((prev) => {
      const nextSideEffects =
        prev.sideEffects.length === 1
          ? [{ effect: "無", severity: "0" } as SideEffectItem]
          : prev.sideEffects.filter((_, i) => i !== index);

      const firstActive =
        nextSideEffects.find((item) => item.effect !== "無") || nextSideEffects[0];

      return {
        ...prev,
        sideEffects: nextSideEffects,
        sideEffect: (firstActive?.effect || "無") as SideEffect,
        sideEffectSeverity: String(firstActive?.severity || "0"),
      };
    });
  };

  const resetForm = () => {
    setForm({
      date: today,
      weight: "",
      dose: "2.5",
      appetite: "正常",
      cravingLevel: "中",
      sideEffect: "無",
      sideEffectSeverity: "0",
      sideEffects: [{ effect: "無", severity: "0" }],
      exerciseMin: "0",
      isShotDay: false,
    });
    setEditingId(null);
  };

  const add = () => {
    if (!form.weight) return;
    if (editingId) {
      setEntries((prev) =>
        prev.map((item) => (item.id === editingId ? { ...form, id: editingId } : item)),
      );
      resetForm();
      return;
    }
    setEntries((prev) => [...prev, { ...form, id: crypto.randomUUID() }]);
    resetForm();
  };

  const handleEdit = (item: Entry) => {
    setForm({
      date: item.date,
      weight: item.weight,
      dose: item.dose,
      appetite: item.appetite,
      cravingLevel: item.cravingLevel,
      sideEffect: item.sideEffect,
      sideEffectSeverity: item.sideEffectSeverity || "0",
      sideEffects:
        item.sideEffects && item.sideEffects.length
          ? item.sideEffects
          : [{ effect: item.sideEffect || "無", severity: item.sideEffectSeverity || "0" }],
      exerciseMin: item.exerciseMin || "0",
      isShotDay: Boolean(item.isShotDay),
    });
    setEditingId(item.id);
  };

  const handleDelete = (id: string) => {
    setEntries((prev) => prev.filter((item) => item.id !== id));
    if (editingId === id) resetForm();
  };

  const catchUpShotToday = () => {
    const baseWeight = latest?.weight || form.weight || "";
    setEntries((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        date: today,
        weight: baseWeight,
        dose: latest?.dose || form.dose || "2.5",
        appetite: latest?.appetite || "正常",
        cravingLevel: latest?.cravingLevel || "中",
        sideEffect: latest?.sideEffect || "無",
        sideEffectSeverity: latest?.sideEffectSeverity || "0",
        sideEffects:
          latest?.sideEffects && latest.sideEffects.length
            ? latest.sideEffects
            : [{ effect: latest?.sideEffect || "無", severity: latest?.sideEffectSeverity || "0" }],
        exerciseMin: latest?.exerciseMin || "0",
        isShotDay: true,
      },
    ]);
  };

  const addLatestDoseToInventoryUsage = () => {
    if (!latest?.dose) return;
    const strength = Math.max(0, num(penInventory.penStrength));
    const dose = Math.max(0, num(latest.dose));
    if (!strength || !dose || dose > strength) return;
    const clicks = Math.round((dose / strength) * 60);
    setPenInventory((prev) => ({
      ...prev,
      usedGrids: String(num(prev.usedGrids) + clicks),
    }));
  };

  const addPhotoRecord = async (file?: File | null) => {
    if (!file) return;
    try {
      const imageData = await fileToDataUrl(file);
      setPhotoRecords((prev) => [
        {
          id: crypto.randomUUID(),
          date: photoDate,
          note: photoNote,
          imageData,
        },
        ...prev,
      ]);
      setPhotoNote("");
      setPhotoDate(today);
    } catch {
      // ignore
    }
  };

  const deletePhotoRecord = (id: string) => {
    setPhotoRecords((prev) => prev.filter((item) => item.id !== id));
  };

  const exportCSV = () => {
    const header = [
      "date",
      "weight",
      "dose",
      "appetite",
      "cravingLevel",
      "sideEffect",
      "sideEffectSeverity",
      "sideEffects",
      "exerciseMin",
      "isShotDay",
    ];
    const rows = sortedEntries.map((e) => [
      e.date,
      e.weight,
      e.dose,
      e.appetite,
      e.cravingLevel,
      e.sideEffect,
      e.sideEffectSeverity,
      (e.sideEffects || []).map((se) => `${se.effect}(${se.severity})`).join(" / "),
      e.exerciseMin,
      e.isShotDay ? "Y" : "N",
    ]);
    downloadTextFile(
      `mounjaro-records-${today}.csv`,
      [header, ...rows].map((r) => r.join(",")).join("\n"),
    );
  };

  const exportJSON = () => {
    downloadTextFile(
      `mounjaro-records-${today}.json`,
      JSON.stringify({ settings, entries: sortedEntries, penInventory, photoRecords }, null, 2),
    );
  };

  const requestNotificationPermission = async () => {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    const permission = await Notification.requestPermission();
    setNotificationPermission(permission);
  };

  const sendBrowserNotification = (title: string, body: string) => {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    if (notificationPermission !== "granted") return;
    new Notification(title, { body });
  };

  useEffect(() => {
    if (!today) return;
    if (!settings.notificationsOn) return;
    if (notificationPermission !== "granted") return;

    const sentKey = `mounjaro-notify-${today}`;
    if (typeof window !== "undefined" && sessionStorage.getItem(sentKey)) return;

    const messages: string[] = [];
    const diff =
      nextShot.date && nextShot.date !== "-" ? daysBetween(today, nextShot.date) : 999;

    if (
      (settings.remindOneDayBefore && diff === 1) ||
      (settings.remindOnShotDay && diff === 0)
    ) {
      messages.push(`施打提醒：${nextShot.text}（${nextShot.date}）`);
    }
    if (settings.remindIfNoLogByNight && !sortedEntries.some((e) => e.date === today)) {
      messages.push("今天還沒有新增紀錄");
    }
    if (settings.waterReminder && latest?.sideEffect === "便秘") {
      messages.push("今天記得補水");
    }
    if (
      settings.proteinReminder &&
      (latest?.appetite === "下降" || latest?.cravingLevel === "高")
    ) {
      messages.push("今天優先補蛋白質");
    }
    if (isELCDDay) {
      messages.push(`今日 ELCD 啟動，AI 分數 ${elcdStatus.score}`);
    }

    if (messages.length) {
      sendBrowserNotification("猛健樂個人版 Pro", messages.join("｜"));
      if (typeof window !== "undefined") {
        sessionStorage.setItem(sentKey, "1");
      }
    }
  }, [
    settings.notificationsOn,
    notificationPermission,
    today,
    nextShot.text,
    nextShot.date,
    isELCDDay,
    elcdStatus.score,
    settings.remindOneDayBefore,
    settings.remindOnShotDay,
    settings.remindIfNoLogByNight,
    settings.waterReminder,
    settings.proteinReminder,
    latest,
    sortedEntries,
  ]);

  if (!mounted || !today) return null;

  return (
    <div className="w-full max-w-md mx-auto min-h-screen bg-slate-50 p-3 space-y-4 pb-24">
      <div className="rounded-2xl bg-white/90 backdrop-blur border p-4 shadow-sm space-y-3">
        <div>
          <h1 className="text-xl font-bold">猛健樂個人版 Pro</h1>
          <p className="text-xs text-slate-500 mt-1">
            手機 App 版介面｜體重、施打、AI 分析一次看
          </p>
        </div>

        <div className="flex items-center justify-between gap-2">
          <div className="text-xs text-slate-500">
            通知：
            {notificationPermission === "granted"
              ? "已啟用"
              : notificationPermission === "denied"
                ? "已封鎖"
                : notificationPermission === "unsupported"
                  ? "不支援"
                  : "未授權"}
          </div>
          <Button size="sm" variant="outline" onClick={requestNotificationPermission}>
            開啟通知
          </Button>
        </div>

        {((
          (settings.remindOneDayBefore && nextShot.text === "1 天後") ||
          (settings.remindOnShotDay && nextShot.text === "今天") ||
          isELCDDay ||
          shotStatus.overdueDays > 0
        )) ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm space-y-1">
            {((
              (settings.remindOneDayBefore && nextShot.text === "1 天後") ||
              (settings.remindOnShotDay && nextShot.text === "今天")
            )) ? (
              <div>🔔 施打提醒：{nextShot.text}（{nextShot.date}）</div>
            ) : null}
            {shotStatus.overdueDays > 0 ? (
              <div>⚠️ 已逾期 {shotStatus.overdueDays} 天，可按下方「今天補打」重設基準</div>
            ) : null}
            {isELCDDay ? <div>🔥 今日 ELCD 啟動中：AI 分數 {elcdStatus.score}</div> : null}
          </div>
        ) : null}
      </div>

      <div className="grid gap-3 grid-cols-2">
        <Card>
          <CardContent className="p-4 space-y-1">
            <div className="flex items-center gap-2 text-sm">
              <Scale className="w-4 h-4" />
              目前體重
            </div>
            <div className="text-2xl font-semibold">{latestWeight || "-"}</div>
            <div className="text-xs text-slate-500">kg</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 space-y-1">
            <div className="flex items-center gap-2 text-sm">
              <HeartPulse className="w-4 h-4" />
              BMI
            </div>
            <div className="text-2xl font-semibold">{bmi || "-"}</div>
            <div className="text-xs text-slate-500">{bmiLabel}</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 space-y-1">
            <div className="flex items-center gap-2 text-sm">
              <Flame className="w-4 h-4" />
              BMR
            </div>
            <div className="text-2xl font-semibold">{bmr || "-"}</div>
            <div className="text-xs text-slate-500">kcal</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 space-y-1">
            <div className="flex items-center gap-2 text-sm">
              <Bell className="w-4 h-4" />
              下次施打
              {nextShot.shouldNotify ? (
                <span className="inline-flex h-2.5 w-2.5 rounded-full bg-red-500" />
              ) : null}
            </div>
            <div className="text-lg font-semibold">{nextShot.text}</div>
            <div className="text-xs text-slate-500">
              {nextShot.date !== "-" ? nextShot.date : "尚未建立"}
            </div>
            <div className="text-[11px] text-slate-400">
              基準：{nextShot.source}（{nextShot.baseDate}）
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-3 grid-cols-1">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Syringe className="w-4 h-4" />
              本週施打狀態
            </div>
            <div className="text-lg font-semibold">{shotStatus.status}</div>
            <div className="text-sm text-slate-500">{shotStatus.text}</div>
            {shotCycleDay ? <div className="text-sm mt-2">目前為施打後第 {shotCycleDay} 天</div> : null}
            <div className="flex gap-2 mt-3">
              <Button size="sm" variant="outline" onClick={catchUpShotToday}>
                <RotateCcw className="w-4 h-4 mr-1" />
                今天補打
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Flame className="w-4 h-4" />
              ELCD 狀態
            </div>
            <div className="text-lg font-semibold">
              {settings.elcdMode ? (isELCDDay ? "今天啟動" : "今天不啟動") : "未開啟"}
            </div>
            <div className="text-sm text-slate-500">AI 分數：{elcdStatus.score}</div>
            <div className="text-sm mt-2 space-y-1">
              {elcdStatus.reasons.slice(0, 2).map((r) => (
                <div key={r}>• {r}</div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <CalendarClock className="w-4 h-4" />
              達標預測
            </div>
            <div className="text-sm">{eta.text}</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingDown className="w-4 h-4" />
              每週減重分析
            </div>
            <div className="text-xl font-semibold">約 {weeklyLoss || 0} kg/週</div>
            <div className="text-sm text-slate-500 mt-1">近 7 天變化 {recent7Delta} kg</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Droplets className="w-4 h-4" />
              水分/脂肪判斷
            </div>
            <div className="text-sm">{waterVsFat}</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-4 h-4" />
              暴食風險
            </div>
            <div className="text-xl font-semibold">{bingeRisk.level}</div>
            <div className="text-sm text-slate-500">{bingeRisk.text}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Target className="w-4 h-4" />
              目標進度
            </span>
            <span>{progress}%</span>
          </div>
          <Progress value={progress} />
          <div className="text-sm text-slate-500">
            理想體重區間：約 {idealRange.low || "-"} ~ {idealRange.high || "-"} kg
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="add" className="space-y-4">
        <div className="-mx-1 overflow-x-auto pb-1">
          <TabsList className="inline-flex h-auto w-max min-w-full gap-1 rounded-2xl bg-white p-1 shadow-sm">
            <TabsTrigger value="add" className="rounded-xl shrink-0 px-4">
              新增
            </TabsTrigger>
            <TabsTrigger value="chart" className="rounded-xl shrink-0 px-4">
              趨勢
            </TabsTrigger>
            <TabsTrigger value="ai" className="rounded-xl shrink-0 px-4">
              AI
            </TabsTrigger>
            <TabsTrigger value="strategy" className="rounded-xl shrink-0 px-4">
              策略
            </TabsTrigger>
            <TabsTrigger value="settings" className="rounded-xl shrink-0 px-4">
              設定
            </TabsTrigger>
            <TabsTrigger value="shots" className="rounded-xl shrink-0 px-4">
              施打
            </TabsTrigger>
            <TabsTrigger value="tools" className="rounded-xl shrink-0 px-4">
              工具
            </TabsTrigger>
            <TabsTrigger value="cheat" className="rounded-xl shrink-0 px-4">
              放鬆
            </TabsTrigger>
            <TabsTrigger value="learn" className="rounded-xl shrink-0 px-4">
              學習
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="add">
          <Card>
            <CardHeader>
              <CardTitle>{editingId ? "編輯紀錄" : "新增紀錄"}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-1 gap-3">
                <div className="space-y-2">
                  <Label>日期</Label>
                  <Input
                    type="date"
                    value={form.date}
                    onChange={(e) => setForm({ ...form, date: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>體重 (kg)</Label>
                  <Input
                    placeholder="體重"
                    value={form.weight}
                    onChange={(e) => setForm({ ...form, weight: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3">
                <div className="space-y-2">
                  <Label>劑量</Label>
                  <Select value={form.dose} onValueChange={(v) => setForm({ ...form, dose: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="2.5">2.5 mg</SelectItem>
                      <SelectItem value="5">5 mg</SelectItem>
                      <SelectItem value="7.5">7.5 mg</SelectItem>
                      <SelectItem value="10">10 mg</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>運動分鐘數</Label>
                  <Input
                    placeholder="例如 30"
                    value={form.exerciseMin}
                    onChange={(e) => setForm({ ...form, exerciseMin: e.target.value })}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between border rounded-xl p-3">
                <div>
                  <div className="font-medium">本次為施打日</div>
                  <div className="text-xs text-slate-500">
                    勾選後，這筆紀錄才會被拿來計算下次施打日
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={form.isShotDay}
                  onChange={(e) => setForm({ ...form, isShotDay: e.target.checked })}
                />
              </div>

              <div className="grid grid-cols-1 gap-3">
                <div className="space-y-2">
                  <Label>食慾</Label>
                  <Select
                    value={form.appetite}
                    onValueChange={(v: Appetite) => setForm({ ...form, appetite: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="下降">下降</SelectItem>
                      <SelectItem value="正常">正常</SelectItem>
                      <SelectItem value="偏餓">偏餓</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>嘴饞程度</Label>
                  <Select
                    value={form.cravingLevel}
                    onValueChange={(v: CravingLevel) => setForm({ ...form, cravingLevel: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="低">低</SelectItem>
                      <SelectItem value="中">中</SelectItem>
                      <SelectItem value="高">高</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>副作用</Label>
                    <Button type="button" size="sm" onClick={addSideEffectField}>
                      <Plus className="w-4 h-4 mr-1" />
                      新增
                    </Button>
                  </div>

                  <div className="space-y-3">
                    {form.sideEffects.map((item, index) => (
                      <div
                        key={index}
                        className="rounded-xl border border-slate-200 bg-white p-3 space-y-3"
                      >
                        <div className="flex items-center justify-between">
                          <div className="text-sm font-medium text-slate-600">副作用 {index + 1}</div>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => removeSideEffectField(index)}
                          >
                            刪除
                          </Button>
                        </div>

                        <div className="space-y-2">
                          <Label>副作用項目</Label>
                          <Select
                            value={item.effect}
                            onValueChange={(v: SideEffect) =>
                              updateSideEffectField(index, "effect", v)
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="無">無</SelectItem>
                              <SelectItem value="噁心">噁心</SelectItem>
                              <SelectItem value="便秘">便秘</SelectItem>
                              <SelectItem value="腹脹">腹脹</SelectItem>
                              <SelectItem value="腹瀉">腹瀉</SelectItem>
                              <SelectItem value="胃食道逆流">胃食道逆流</SelectItem>
                              <SelectItem value="頭暈">頭暈</SelectItem>
                              <SelectItem value="疲倦">疲倦</SelectItem>
                              <SelectItem value="注射部位不適">注射部位不適</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label>不適程度（0~5）</Label>
                          <Input
                            placeholder="0~5"
                            value={item.severity}
                            onChange={(e) =>
                              updateSideEffectField(index, "severity", e.target.value)
                            }
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                <Button onClick={add} className="w-full">
                  <Plus className="w-4 h-4 mr-1" />
                  {editingId ? "更新紀錄" : "新增紀錄"}
                </Button>
                {editingId ? (
                  <Button variant="outline" onClick={resetForm}>
                    取消
                  </Button>
                ) : null}
              </div>

              <div className="border-t pt-4 space-y-3">
                <div className="text-sm font-medium">歷史紀錄</div>
                {sortedEntries.length === 0 ? (
                  <div className="text-sm text-slate-500">目前還沒有紀錄</div>
                ) : (
                  [...sortedEntries].reverse().map((item) => (
                    <div key={item.id} className="rounded-xl border p-3 space-y-2">
                      <div className="flex items-start justify-between gap-3">
                        <div className="text-sm space-y-1">
                          <div className="font-medium">
                            {item.date} ・ {item.dose} mg {item.isShotDay ? "・ 施打日" : ""}
                          </div>
                          <div>體重：{item.weight} kg</div>
                          <div>
                            食慾：{item.appetite}｜嘴饞：{item.cravingLevel}
                          </div>
                          <div>
                            副作用：
                            {item.sideEffects && item.sideEffects.length
                              ? item.sideEffects
                                  .map((se) => `${se.effect}（${se.severity || 0}/5）`)
                                  .join("、")
                              : `${item.sideEffect}（${item.sideEffectSeverity || 0}/5）`}｜
                            運動：{item.exerciseMin || 0} 分鐘
                          </div>
                          {item.isShotDay ? <div className="text-emerald-600">💉 施打日</div> : null}
                        </div>

                        <div className="flex gap-2">
                          <Button size="icon" variant="outline" onClick={() => handleEdit(item)}>
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button size="icon" variant="outline" onClick={() => handleDelete(item.id)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="chart">
          <div className="grid gap-4 grid-cols-1">
            <Card>
              <CardHeader>
                <CardTitle>體重趨勢</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={260}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    {num(settings.goal) ? <ReferenceLine y={num(settings.goal)} /> : null}
                    <Line dataKey="weight" strokeWidth={2} dot />
                    <Line dataKey="avg7" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>分析摘要</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div>
                  停滯期：
                  <Badge variant={plateau.isPlateau ? "destructive" : "secondary"}>
                    {plateau.isPlateau ? "可能停滯" : "正常"}
                  </Badge>
                </div>
                <div>{plateau.text}</div>
                <div>估算體脂：{bodyFat || "-"}%</div>
                <div>7日移動平均：{chartData.length ? chartData[chartData.length - 1].avg7 : "-"} kg</div>
                <div>TDEE：{tdee || "-"} kcal</div>
                <div>建議減脂熱量：{cutCalories || "-"} kcal</div>
                <div>性別版型：{settings.sex === "female" ? "女性建議" : "男性建議"}</div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="ai">
          <div className="grid gap-4 grid-cols-1">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Utensils className="w-4 h-4" />
                  更精準菜單
                </CardTitle>
              </CardHeader>
              <div className="px-6 pb-2 text-sm text-slate-600 space-y-1">
                <div>{calorieAdvice.base}</div>
                <div>{calorieAdvice.target}</div>
                <div className="text-slate-500">{calorieAdvice.note}</div>
              </div>
              <CardContent className="space-y-4">
                {mealPlans.map((plan) => (
                  <div key={plan.title} className="border rounded-xl p-3 space-y-2">
                    <div className="font-medium">{plan.title}</div>
                    {plan.meals.map((meal) => (
                      <div key={meal.name}>
                        <div className="text-sm font-medium">{meal.name}</div>
                        <div className="text-sm text-slate-600 space-y-1">
                          {meal.items.map((item) => (
                            <div key={item}>• {item}</div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>嘴饞控制建議</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {cravingTips.map((tip) => (
                  <div key={tip}>• {tip}</div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="strategy">
          <div className="grid gap-4 grid-cols-1">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="w-4 h-4" />
                  猛健樂專用減脂策略
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {strategyMode.map((tip) => (
                  <div key={tip}>• {tip}</div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CalendarClock className="w-4 h-4" />
                  可再觀察的項目
                </CardTitle>
              </CardHeader>
              <div className="mt-4 border-t pt-3 px-6">
                <div className="text-sm font-medium mb-1">💉 劑量AI判斷</div>
                <div className="text-lg font-semibold">{doseAI.level}</div>
                <div className="text-sm text-slate-500">{doseAI.reason}</div>
                <div className="text-sm">👉 {doseAI.action}</div>
              </div>
              <CardContent className="space-y-2 text-sm">
                <div>• 施打後第 2~3 天食慾是否最低</div>
                <div>• 哪幾天最容易嘴饞</div>
                <div>• 外食日後體重波動是否偏大</div>
                <div>• 運動分鐘數增加後，體重是否更穩定下降</div>
                <div>• 若連續 2 週停滯，再檢查熱量與零食</div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="shots">
          <div className="grid gap-4 grid-cols-1">
            <Card>
              <CardHeader>
                <CardTitle>施打紀錄專區</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div>最近施打日：{latestShotDate || "-"}</div>
                <div>下次施打日：{nextShot.date}</div>
                <div>目前：施打後第 {shotPattern.currentDay || 0} 天</div>
                {shotEntries.length === 0 ? (
                  <div className="text-slate-500">尚無施打紀錄</div>
                ) : (
                  shotEntries.map((item, index) => (
                    <div key={item.id} className="rounded-xl border p-3">
                      <div className="font-medium">
                        第 {shotEntries.length - index} 針｜{item.date}｜{item.dose} mg
                      </div>
                      {index < shotEntries.length - 1 ? (
                        <div className="text-slate-500">
                          距離前一針 {daysBetween(shotEntries[index + 1].date, item.date)} 天
                        </div>
                      ) : null}
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>施打後第幾天分析</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div>食慾最低：{shotPattern.appetiteText}</div>
                <div>最容易嘴饞：{shotPattern.cravingText}</div>
                <div>最容易出現副作用：{shotPattern.sideEffectText}</div>
                <div>副作用總結：{sideEffectInsight.text}</div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle>設定</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-1 gap-3">
                <div className="space-y-2">
                  <Label>身高 (cm)</Label>
                  <Input
                    value={tempSettings.height}
                    onChange={(e) => setTempSettings({ ...tempSettings, height: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label>年齡</Label>
                  <Input
                    value={tempSettings.age}
                    onChange={(e) => setTempSettings({ ...tempSettings, age: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3">
                <div className="space-y-2">
                  <Label>目標體重 (kg)</Label>
                  <Input
                    value={tempSettings.goal}
                    onChange={(e) => setTempSettings({ ...tempSettings, goal: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label>首次施打日期</Label>
                  <Input
                    type="date"
                    value={tempSettings.firstShotDate}
                    onChange={(e) =>
                      setTempSettings({ ...tempSettings, firstShotDate: e.target.value })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label>施打間隔（天）</Label>
                  <Input
                    value={tempSettings.shotInterval}
                    onChange={(e) =>
                      setTempSettings({ ...tempSettings, shotInterval: e.target.value })
                    }
                  />
                  <div className="text-xs text-slate-500">猛健樂每週一次請填 7，不要用 8。</div>
                </div>
              </div>

              <div className="rounded-xl border bg-slate-50 p-3 text-sm space-y-1">
                <div className="font-medium">下次施打預覽</div>
                <div>日期：{previewNextShot.date}</div>
                <div>狀態：{previewNextShot.text}</div>
                <div>基準：{previewNextShot.source}（{previewNextShot.baseDate}）</div>
                <div className="text-xs text-slate-500">
                  規則：本次施打日 + 間隔天數 = 下次施打日。若每週一次，請填 7，這週三打就是下週三打。
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3">
                <div className="space-y-2">
                  <Label>性別</Label>
                  <Select
                    value={tempSettings.sex}
                    onValueChange={(v: Sex) => setTempSettings({ ...tempSettings, sex: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">男性</SelectItem>
                      <SelectItem value="female">女性</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>活動量</Label>
                  <Select
                    value={tempSettings.activity}
                    onValueChange={(v) => setTempSettings({ ...tempSettings, activity: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1.2">久坐少動</SelectItem>
                      <SelectItem value="1.375">輕度活動</SelectItem>
                      <SelectItem value="1.55">中度活動</SelectItem>
                      <SelectItem value="1.725">高度活動</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between border rounded-xl p-3">
                  <div>
                    <div className="font-medium">通知總開關</div>
                    <div className="text-xs text-slate-500">瀏覽器提醒與頁面提醒</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={tempSettings.notificationsOn}
                    onChange={(e) =>
                      setTempSettings({ ...tempSettings, notificationsOn: e.target.checked })
                    }
                  />
                </div>

                {[
                  ["前一天提醒", "remindOneDayBefore"],
                  ["施打當天提醒", "remindOnShotDay"],
                  ["晚上未記錄提醒", "remindIfNoLogByNight"],
                  ["便秘補水提醒", "waterReminder"],
                  ["低食慾/高嘴饞蛋白質提醒", "proteinReminder"],
                ].map(([label, key]) => (
                  <div key={key} className="flex items-center justify-between border rounded-xl p-3">
                    <div className="font-medium">{label}</div>
                    <input
                      type="checkbox"
                      checked={Boolean(tempSettings[key as keyof Settings])}
                      onChange={(e) =>
                        setTempSettings({
                          ...tempSettings,
                          [key]: e.target.checked,
                        } as Settings)
                      }
                    />
                  </div>
                ))}

                <div className="flex items-center justify-between border rounded-xl p-3">
                  <div>
                    <div className="font-medium">極低熱量模式</div>
                    <div className="text-xs text-slate-500">AI 自動判斷是否啟用 ELCD</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={tempSettings.elcdMode}
                    onChange={(e) =>
                      setTempSettings({ ...tempSettings, elcdMode: e.target.checked })
                    }
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  className="w-full"
                  onClick={() => {
                    setSettings(tempSettings);
                    localStorage.setItem(SETTINGS_KEY, JSON.stringify(tempSettings));
                  }}
                >
                  儲存設定
                </Button>

                <Button variant="outline" onClick={() => setTempSettings(settings)}>
                  取消
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tools">
          <div className="grid gap-4 grid-cols-1">
            <Card>
              <CardHeader>
                <CardTitle>藥筆藥量計算機</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                <div className="rounded-xl border bg-slate-50 p-3 text-slate-600">
                  本計算機以 <span className="font-medium text-slate-900">一枝筆共 60 格</span> 為基準。
                </div>

                <div className="space-y-2">
                  <Label>快速按鈕</Label>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {penQuickPresets.map((preset) => (
                      <Button
                        key={preset.label}
                        type="button"
                        variant={
                          penStrength === preset.strength && targetDose === preset.dose
                            ? "default"
                            : "outline"
                        }
                        className="h-auto whitespace-normal px-3 py-2 text-xs"
                        onClick={() => {
                          setPenStrength(preset.strength);
                          setTargetDose(preset.dose);
                        }}
                      >
                        {preset.label}
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>藥筆總劑量（mg）</Label>
                    <Select value={penStrength} onValueChange={setPenStrength}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="2.5">2.5 mg</SelectItem>
                        <SelectItem value="5">5 mg</SelectItem>
                        <SelectItem value="7.5">7.5 mg</SelectItem>
                        <SelectItem value="10">10 mg</SelectItem>
                        <SelectItem value="12.5">12.5 mg</SelectItem>
                        <SelectItem value="15">15 mg</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>想注射的劑量（mg）</Label>
                    <Input value={targetDose} onChange={(e) => setTargetDose(e.target.value)} />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div className="rounded-xl border bg-slate-50 p-3">
                    <div className="text-slate-500">換算比例</div>
                    <div className="text-lg font-semibold">{penCalc.ratio}%</div>
                  </div>
                  <div className="rounded-xl border bg-emerald-50 p-3 border-emerald-200">
                    <div className="text-emerald-700">本次需轉</div>
                    <div className="text-2xl font-bold text-emerald-700">{penCalc.clicks} 格</div>
                  </div>
                  <div className="rounded-xl border bg-slate-50 p-3">
                    <div className="text-slate-500">剩餘格數</div>
                    <div className="text-lg font-semibold">{penCalc.remainClicks} 格</div>
                  </div>
                </div>

                {!penCalc.valid ? (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-amber-800">
                    目標劑量不可大於藥筆總劑量，請重新輸入。
                  </div>
                ) : null}

                <div className="rounded-xl border p-3 space-y-2">
                  <div className="font-medium">常用對照</div>
                  <div className="text-sm text-slate-600">10 mg 筆打 2.5 mg：約 15 格</div>
                  <div className="text-sm text-slate-600">10 mg 筆打 5 mg：約 30 格</div>
                  <div className="text-sm text-slate-600">15 mg 筆打 10 mg：約 40 格</div>
                </div>

                <div className="text-xs text-slate-500">
                  計算方式：目標劑量 ÷ 藥筆總劑量 × 60 格。使用前仍請以實際藥筆刻度與醫囑為準。
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>劑量提升提醒</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="text-lg font-semibold">{doseEscalationPlan.title}</div>
                <div className="text-slate-500">{doseEscalationPlan.subtitle}</div>
                <div>目前連續劑量：{currentDoseSeries.dose} mg</div>
                <div>同劑量累積針數：{currentDoseSeries.shotCount} 針</div>
                <div>下一步建議：{doseEscalationPlan.nextDose}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>藥筆庫存管理</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div className="space-y-2">
                    <Label>目前庫存筆規格</Label>
                    <Select
                      value={penInventory.penStrength}
                      onValueChange={(v) => setPenInventory({ ...penInventory, penStrength: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="2.5">2.5 mg</SelectItem>
                        <SelectItem value="5">5 mg</SelectItem>
                        <SelectItem value="7.5">7.5 mg</SelectItem>
                        <SelectItem value="10">10 mg</SelectItem>
                        <SelectItem value="12.5">12.5 mg</SelectItem>
                        <SelectItem value="15">15 mg</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>現有幾支筆</Label>
                    <Input
                      value={penInventory.totalPens}
                      onChange={(e) =>
                        setPenInventory({ ...penInventory, totalPens: e.target.value })
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>已使用格數</Label>
                    <Input
                      value={penInventory.usedGrids}
                      onChange={(e) =>
                        setPenInventory({ ...penInventory, usedGrids: e.target.value })
                      }
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <div className="rounded-xl border p-3">
                    <div className="text-slate-500">總格數</div>
                    <div className="text-lg font-semibold">{penInventorySummary.totalGrids}</div>
                  </div>
                  <div className="rounded-xl border p-3">
                    <div className="text-slate-500">剩餘格數</div>
                    <div className="text-lg font-semibold">{penInventorySummary.remainGrids}</div>
                  </div>
                  <div className="rounded-xl border p-3">
                    <div className="text-slate-500">剩餘 mg</div>
                    <div className="text-lg font-semibold">{penInventorySummary.remainMg}</div>
                  </div>
                  <div className="rounded-xl border p-3">
                    <div className="text-slate-500">依目前劑量約可再打</div>
                    <div className="text-lg font-semibold">{penInventorySummary.shotsLeft} 次</div>
                  </div>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={addLatestDoseToInventoryUsage}
                >
                  依最近一次施打自動扣庫存
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>照片記錄</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>照片日期</Label>
                    <Input
                      type="date"
                      value={photoDate}
                      onChange={(e) => setPhotoDate(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>備註</Label>
                    <Input
                      value={photoNote}
                      onChange={(e) => setPhotoNote(e.target.value)}
                      placeholder="例如：正面、腰圍比較、側面"
                    />
                  </div>
                </div>

                <Input
                  type="file"
                  accept="image/*"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    await addPhotoRecord(file);
                    e.currentTarget.value = "";
                  }}
                />

                <div className="text-xs text-slate-500">
                  照片會存於本機瀏覽器。若照片很多，建議定期匯出備份。
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {photoRecords.length === 0 ? (
                    <div className="text-slate-500">尚無照片紀錄</div>
                  ) : (
                    photoRecords.map((record) => (
                      <div key={record.id} className="rounded-xl border p-2 space-y-2">
                        <img
                          src={record.imageData}
                          alt={record.note || record.date}
                          className="h-40 w-full rounded-lg object-cover"
                        />
                        <div className="text-xs font-medium">{record.date}</div>
                        <div className="text-xs text-slate-500">{record.note || "-"}</div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="w-full"
                          onClick={() => deletePhotoRecord(record.id)}
                        >
                          刪除
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>資料匯出</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button className="w-full" variant="outline" onClick={exportCSV}>
                  <Download className="w-4 h-4 mr-1" />
                  匯出 CSV
                </Button>
                <Button className="w-full" variant="outline" onClick={exportJSON}>
                  <Download className="w-4 h-4 mr-1" />
                  匯出 JSON
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="cheat">
          <div className="grid gap-4 grid-cols-1">
            <Card>
              <CardHeader>
                <CardTitle>🤖 智能放鬆餐判斷</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-xl font-semibold">{cheatDecision.level}</div>
                <div className="text-sm text-slate-500">原因：{cheatDecision.reason}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>建議吃法</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {cheatDecision.plan.map((p) => (
                  <div key={p}>• {p}</div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="learn">
          <div className="grid gap-4 grid-cols-1">
            <Card>
              <CardHeader>
                <CardTitle>🧠 個人化 AI 學習</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="font-medium">{personalAI.summary}</div>
                <div className="text-sm text-slate-600">
                  最容易成功的時段／狀態：{personalAI.bestWindow}
                </div>
                <div className="text-sm text-slate-600">
                  最容易失守的時段／狀態：{personalAI.riskWindow}
                </div>
                <div className="text-sm text-slate-600">
                  目前看起來最有效的模式：{personalAI.effectivePattern}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>AI 學到的重點</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {personalAI.learningTips.map((tip) => (
                  <div key={tip}>• {tip}</div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
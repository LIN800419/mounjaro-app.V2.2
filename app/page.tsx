"use client";

import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
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
  Syringe,
  RotateCcw,
  Expand,
  X,
  Moon,
  Sun,
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
type BmrMethod = "mifflin" | "katch";
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
  bodyFatPct: string;
  fatMass: string;
  muscleRate: string;
  muscleMass: string;
  visceralFat: string;
  bodyWater: string;
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
  bmrMethod: BmrMethod;
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
  totalGrids: string;
  penStartDate: string;
  manualAdjustGrids: string;
};

type PhotoRecord = {
  id: string;
  date: string;
  note: string;
  imageData: string;
};

type WorkoutEquipment = "bike" | "treadmill" | "kettlebell";
type WorkoutLevel = "low" | "mid" | "high";
type WorkoutStyle = "easy" | "hard";
type WorkoutCategory = "cardio" | "strength" | "core";
type WorkoutPart = "上肢" | "下肢" | "核心" | "全身" | "有氧";

type WorkoutDefinition = {
  id: string;
  name: string;
  category: WorkoutCategory;
  part: WorkoutPart;
  equipment: WorkoutEquipment | "bodyweight";
  steps: string[];
  tips: string[];
  mistakes: string[];
  breathing: string;
  caution: string[];
  alternatives: string[];
};

type WorkoutCard = {
  id: string;
  name: string;
  category: WorkoutCategory;
  part: WorkoutPart;
  equipment: WorkoutEquipment | "bodyweight";
  setsText?: string;
  repsText?: string;
  durationText?: string;
  restText?: string;
  parameterText?: string[];
  feeling?: string;
  tutorial: Omit<WorkoutDefinition, "id" | "name" | "category" | "part" | "equipment">;
};

type WorkoutPlan = {
  title: string;
  subtitle: string;
  estimatedMinutes: string;
  focus: string;
  cards: WorkoutCard[];
};

type CloudPayload = {
  entries: Entry[];
  settings: Settings;
  penInventory: PenInventory;
  photoRecords: PhotoRecord[];
};

const WORKOUT_DEFINITIONS: WorkoutDefinition[] = [
  {
    id: "bike_ride",
    name: "飛輪輕鬆騎",
    category: "cardio",
    part: "有氧",
    equipment: "bike",
    steps: [
      "先調整座墊高度到踩到最低點時膝蓋仍保有微彎，不要完全打直；坐上車後雙腳踏穩，先用很輕的阻力暖身 2~3 分鐘。",
      "上半身保持穩定，肩膀放鬆、手輕扶把手，核心微收，不要聳肩或整個人壓在把手上。",
      "正式開始後用順暢節奏持續踩踏，重點是穩定完成，不是拼命衝快；踩到底時腳跟與膝蓋方向自然對齊。",
      "結束前 2~3 分鐘把阻力慢慢降回輕鬆區，讓心跳與呼吸逐步回穩，再下車。",
    ],
    tips: [
      "腳掌平均出力，不要只用前腳掌猛踩",
      "骨盆坐穩在座墊上，避免左右晃動",
      "阻力寧可保守，先求能完成整段時間",
    ],
    mistakes: [
      "一開始阻力就開太重，導致很快爆掉",
      "身體前後左右亂晃，代表阻力或速度失控",
      "肩頸出力太多、手把抓太緊",
    ],
    breathing: "全程自然呼吸，維持微喘但仍可短句說話的程度即可。",
    caution: [
      "膝蓋不舒服時先把阻力調低，並確認座墊高度是否過低",
      "若出現頭暈、胸悶或噁心，先減速並停下補水休息",
    ],
    alternatives: ["跑步機快走 20~30 分鐘", "原地踏步 10~15 分鐘"],
  },
  {
    id: "treadmill_walk",
    name: "跑步機快走",
    category: "cardio",
    part: "有氧",
    equipment: "treadmill",
    steps: [
      "先站穩在跑帶兩側，等機器啟動後再自然走上去，用輕鬆速度暖身 2~3 分鐘。",
      "走路時抬頭看前方、胸口微打開、肩膀放鬆，手臂自然擺動，盡量不要長時間抓著扶手。",
      "步伐維持自然、不用跨太大步，讓腳跟先落地再往前滾動到腳掌，保持穩定快走節奏。",
      "結束前先把速度慢慢降回輕鬆走，再停機，不要在高速時直接跳下機台。",
    ],
    tips: [
      "步伐小一點、穩一點，比硬撐大步更好",
      "手臂自然擺動能幫助節奏更順",
      "感覺喘但還能完成全程，就是合適強度",
    ],
    mistakes: [
      "一直抓扶手借力，讓真實運動量變低",
      "跨步太大導致骨盆晃動、膝蓋壓力增加",
      "低頭看腳或彎腰駝背",
    ],
    breathing: "自然呼吸即可，維持微喘但能穩定完成。",
    caution: [
      "若膝蓋不舒服先把速度與坡度都降下來",
      "若平衡感較差，剛開始可短暫輕扶扶手，但不要全程依賴",
    ],
    alternatives: ["飛輪輕鬆騎 20~30 分鐘", "戶外平地快走"],
  },
  {
    id: "treadmill_incline",
    name: "跑步機坡度走",
    category: "cardio",
    part: "有氧",
    equipment: "treadmill",
    steps: [
      "先用平地快走暖身 2~3 分鐘，等步伐穩定後再慢慢增加坡度，不要一開始就直接開高坡。",
      "加了坡度後身體只要微微前傾，重點是從腳踝整體前傾，不是駝背或折腰往前趴。",
      "雙腳持續穩定走，腳跟先落地再推進到腳掌，讓臀腿與小腿自然參與出力。",
      "結束前先把坡度降回平地，再慢慢降速度走到呼吸恢復。",
    ],
    tips: [
      "先穩定步伐，再調整坡度",
      "膝蓋與腳尖方向一致，不要內夾",
      "上半身穩定、不要靠扶手把自己吊著走",
    ],
    mistakes: [
      "坡度一下開太高，導致姿勢跑掉",
      "身體往後坐或駝背，讓下背代償",
      "一直抓扶手借力，失去坡度走訓練效果",
    ],
    breathing: "自然呼吸，維持中等喘感但不需要憋氣。",
    caution: [
      "小腿容易緊的人，坡度不要拉太高，並在結束後做伸展",
      "膝蓋或腳踝不舒服時先改平地快走",
    ],
    alternatives: ["飛輪輕鬆騎", "平地快走"],
  },
  {
    id: "goblet_squat",
    name: "杯式深蹲",
    category: "strength",
    part: "下肢",
    equipment: "kettlebell",
    steps: [
      "雙腳打開略比肩寬，腳尖自然微朝外，雙手把壺鈴抱在胸前靠近身體，手肘自然朝下。",
      "先吸氣、核心收緊，屁股往後坐再往下蹲，想像自己要坐到後方椅子上，而不是膝蓋先往前衝。",
      "下蹲過程維持胸口打開、背部中立，膝蓋方向跟著腳尖走，不要內夾。",
      "蹲到自己能穩定控制的深度後，用腳跟踩地、臀腿一起出力站回來，回到站姿時把身體完全穩住。",
    ],
    tips: [
      "壺鈴抱近胸口，身體會比較穩",
      "下去時想屁股往後坐，起來時想把地板踩開",
      "全程核心收緊，避免腰鬆掉",
    ],
    mistakes: [
      "駝背抱鈴、胸口掉下去",
      "膝蓋內夾或整個重心跑到前腳掌",
      "起身先抬屁股，變成用腰拉起來",
    ],
    breathing: "蹲下吸氣，起身出力時吐氣。",
    caution: [
      "膝蓋不舒服時先縮小幅度，或改椅子坐站版本",
      "重量太重時先改輕重量或徒手，把姿勢做穩",
    ],
    alternatives: ["徒手深蹲", "椅子坐站"],
  },
  {
    id: "kb_deadlift",
    name: "壺鈴硬舉",
    category: "strength",
    part: "下肢",
    equipment: "kettlebell",
    steps: [
      "雙腳與肩同寬站穩，壺鈴放在雙腳中間偏前方，腳掌平均踩地，膝蓋微彎。",
      "先從髖部往後折疊，像把屁股往後推，讓身體前傾去握住壺鈴，同時背部打平、胸口打開、視線看前下方。",
      "握好後想像把地板踩開，用臀部與大腿後側發力站起來，壺鈴沿著身體前側上來，不要離身體太遠。",
      "站直時臀部夾緊即可，不要過度往後仰；接著再把屁股往後推，控制壺鈴放回起始位置。",
    ],
    tips: [
      "重點是髖關節折疊，不是一直做深蹲",
      "壺鈴越靠近身體，腰背負擔越小",
      "先把背打平，再開始拉起",
    ],
    mistakes: [
      "駝背硬拉起壺鈴",
      "用手臂硬提，而不是臀腿發力",
      "膝蓋過度往前推，動作變成半蹲",
    ],
    breathing: "下放吸氣，站起出力時吐氣。",
    caution: [
      "下背容易痠時，先減重並確認自己有沒有駝背",
      "如果抓不穩或站不穩，先用徒手髖鉸鍊練習",
    ],
    alternatives: ["徒手髖鉸鍊", "臀橋"],
  },
  {
    id: "kb_row",
    name: "單手划船",
    category: "strength",
    part: "上肢",
    equipment: "kettlebell",
    steps: [
      "先把沒有拿壺鈴的那隻手扶在穩固桌面、椅背或同側大腿上，讓身體有支撐。",
      "雙腳前後或左右微錯開站穩，至少與骨盆同寬，膝蓋微彎；扶桌那側腳可略在前，拿壺鈴那側腳略在後。",
      "從髖部折疊讓上半身前傾，背部打平、胸口微打開、視線看前下方，不要駝背也不要聳肩。",
      "拿壺鈴的手自然垂下，先穩住肩膀，再把手肘沿身體側邊往後拉，想像把壺鈴拉向腰側或髖骨後上方。",
      "拉到最高點停 1 秒，感受背部夾緊，再慢慢放回起始位置，不要直接甩下去。",
    ],
    tips: [
      "重心平均放在雙腳，不要整個人壓在支撐手上",
      "手肘往後走，不是把手往上抬",
      "感受背部出力，不要只用手臂硬拉",
    ],
    mistakes: [
      "聳肩、脖子太緊",
      "身體左右扭轉，用甩力帶重量",
      "背部駝掉或下背過度拱起",
    ],
    breathing: "拉起時吐氣，放下時吸氣。",
    caution: [
      "下背不穩時先把支撐做穩，重量也先減輕",
      "肩膀前側不舒服時，先確認是不是拉太高或聳肩",
    ],
    alternatives: ["扶桌輕重量單手划船", "毛巾划船"],
  },
  {
    id: "kb_shoulder_press",
    name: "肩推",
    category: "strength",
    part: "上肢",
    equipment: "kettlebell",
    steps: [
      "站穩後把壺鈴放在肩膀旁，前臂大致直立、手腕保持穩定，不要往後折太多。",
      "核心先收緊、臀部微夾，避免腰椎鬆掉；推起前想像肋骨收回，不要挺肚子。",
      "把壺鈴往上推到手臂接近伸直，過程中肩膀保持穩定，不要聳肩硬推。",
      "到最高點後停一下，再沿原路慢慢放回肩旁，過程保持身體直立。",
    ],
    tips: [
      "先求身體穩，再求推得高",
      "肋骨別外翻，核心要一路收住",
      "若單手比較穩，可以先單手練熟",
    ],
    mistakes: [
      "腰過度後仰，把肩推做成後仰推舉",
      "手腕折太多，讓手腕壓力變大",
      "聳肩、脖子縮起來硬推",
    ],
    breathing: "推起時吐氣，放下時吸氣。",
    caution: [
      "肩膀不舒服時先減重或縮短活動角度",
      "若容易暈眩，可改坐姿或先跳過此動作",
    ],
    alternatives: ["前平舉", "輕重量單手肩推"],
  },
  {
    id: "kb_floor_press",
    name: "地板胸推",
    category: "strength",
    part: "上肢",
    equipment: "kettlebell",
    steps: [
      "仰躺在地，膝蓋彎曲、雙腳踩穩，肩膀放鬆下沉，胸口自然打開。",
      "壺鈴放在胸側上方，前臂大致垂直地面，手肘自然落在身體兩側，不要張太開。",
      "把壺鈴往上推到手臂接近伸直，過程保持手腕穩定，肩胛不要亂滑動。",
      "再慢慢放回，讓手肘輕碰地面即可，不要直接摔下去。",
    ],
    tips: [
      "肩膀下沉、胸口打開，會更穩",
      "手肘角度自然，不要完全外展到 90 度",
      "推起與放下都要控制速度",
    ],
    mistakes: [
      "放太快，直接掉回地面",
      "手腕歪掉或往後折太多",
      "肩膀聳起，讓肩前側壓力過大",
    ],
    breathing: "推起吐氣，回程吸氣。",
    caution: [
      "肩前側不舒服時先縮短幅度或減重",
      "起身拿放壺鈴時慢一點，避免失手撞到自己",
    ],
    alternatives: ["牆推", "跪姿伏地挺身"],
  },
  {
    id: "sumo_squat",
    name: "相撲深蹲",
    category: "strength",
    part: "下肢",
    equipment: "kettlebell",
    steps: [
      "雙腳比肩更寬站穩，腳尖自然朝外，雙手把壺鈴垂放在身體中間。",
      "先吸氣、核心收緊，屁股向後下方坐，讓膝蓋順著腳尖方向打開。",
      "下蹲時維持胸口打開、背部中立，不要駝背，也不要把重心全丟到前腳掌。",
      "到穩定深度後，用腳跟踩地、臀腿一起出力站回來，站直時臀部夾緊即可。",
    ],
    tips: [
      "感受大腿內側與臀部一起出力",
      "壺鈴放在身體中間，身體會更好平衡",
      "膝蓋方向跟著腳尖，不內夾",
    ],
    mistakes: [
      "膝蓋往內夾、腳掌外翻失控",
      "胸口掉下去、背變圓",
      "起身靠腰硬撐，不用臀腿發力",
    ],
    breathing: "蹲下吸氣，起身吐氣。",
    caution: [
      "膝蓋不舒服時先減少蹲深，或改徒手版本",
      "髖部卡卡時，腳站距不要一開始就開太寬",
    ],
    alternatives: ["徒手寬站深蹲", "臀橋"],
  },
  {
    id: "split_squat",
    name: "弓步蹲",
    category: "strength",
    part: "下肢",
    equipment: "kettlebell",
    steps: [
      "先採前後分腿站姿，兩腳大約與骨盆同寬，不要走在同一直線上，這樣會更穩。",
      "身體保持直立、核心收緊，前腳踩穩、後腳以前腳掌支撐。",
      "往下時讓身體垂直下沉，前腳膝蓋跟著腳尖方向，後膝往地板方向接近，不是整個人往前撲。",
      "到底後用前腳腳跟踩地，把身體推回起始位置，再重複。",
    ],
    tips: [
      "前腳負責主要出力，後腳偏輔助平衡",
      "步距抓夠，身體比較不會往前擠",
      "先徒手做穩，再拿壺鈴加重量",
    ],
    mistakes: [
      "前後腳站太窄，導致一直晃",
      "膝蓋晃動太大或內夾",
      "往下太快，失去平衡",
    ],
    breathing: "下去吸氣，起身吐氣。",
    caution: [
      "平衡差時先扶牆或扶椅子做",
      "膝蓋不舒服時可改原地分腿小幅度版本",
    ],
    alternatives: ["扶牆弓步蹲", "原地分腿蹲"],
  },
  {
    id: "glute_bridge",
    name: "臀橋",
    category: "strength",
    part: "下肢",
    equipment: "bodyweight",
    steps: [
      "仰躺屈膝，雙腳與骨盆同寬踩穩地面，腳跟大約在膝蓋正下方附近。",
      "先收緊腹部、骨盆微微後傾，再把臀部往上抬，讓身體從肩膀到膝蓋接近一直線。",
      "最高點停 1 秒，感受臀部夾緊，而不是一直用腰往上頂。",
      "再慢慢把臀部放回地面，維持控制，不要直接掉下去。",
    ],
    tips: [
      "腳跟踩穩，會更容易感受到臀部出力",
      "抬起前先收肚子，腰比較不會代償",
      "高度以臀部有感、下背不擠為主",
    ],
    mistakes: [
      "腰過度拱起，用下背硬頂",
      "只覺得大腿前側在用力，臀部沒感覺",
      "放太快，整組節奏亂掉",
    ],
    breathing: "抬起吐氣，放下吸氣。",
    caution: [
      "下背不舒服時先減少抬起高度",
      "小腿抽筋時把腳跟拉近一點，並確認不要一直用腳尖撐",
    ],
    alternatives: ["短距離臀橋", "椅子坐站"],
  },
  {
    id: "dead_bug",
    name: "死蟲式",
    category: "core",
    part: "核心",
    equipment: "bodyweight",
    steps: [
      "仰躺後把雙手抬向天花板，雙腿抬成 90 度，膝蓋在髖部正上方。",
      "先收緊腹部，讓下背輕貼地面，骨盆保持穩定，這一步比手腳移動更重要。",
      "慢慢把對側手與腳往外伸，幅度只到下背還能貼住地面為止。",
      "回到中間後換邊，整個過程慢、穩、不甩。",
    ],
    tips: [
      "下背貼地是最重要的檢查點",
      "寧可手腳伸少一點，也不要腰拱起來",
      "動作越慢，核心越有感",
    ],
    mistakes: [
      "腰拱起來還硬撐",
      "腿放太低，超出自己能控制的範圍",
      "手腳亂甩、速度太快",
    ],
    breathing: "手腳伸出去時吐氣，回中間吸氣。",
    caution: [
      "下背不舒服時縮小幅度，或先只動手、只動腳",
      "脖子太緊時可墊毛巾，讓頭頸放鬆",
    ],
    alternatives: ["單邊死蟲式", "抱膝核心穩定"],
  },
  {
    id: "plank",
    name: "平板支撐",
    category: "core",
    part: "核心",
    equipment: "bodyweight",
    steps: [
      "前臂撐地，手肘在肩膀正下方，雙腿往後伸直，腳尖踩地。",
      "先把肩膀穩住，再把腹部與臀部收緊，讓身體從頭到腳維持一直線。",
      "眼睛看前下方，脖子自然延伸，不要抬頭也不要垂頭。",
      "整段時間只要穩穩撐住，不需要一直憋到全身發抖才算有效。",
    ],
    tips: [
      "屁股略收、肚子略收，最容易找到正確姿勢",
      "想像把肚臍往脊椎方向收回",
      "秒數先保守，姿勢穩比撐很久更重要",
    ],
    mistakes: [
      "塌腰，讓下背壓力過大",
      "屁股翹太高，變成核心偷懶",
      "肩膀聳起、脖子縮住",
    ],
    breathing: "自然呼吸，不要憋氣。",
    caution: [
      "太吃力可以先改膝蓋著地版本",
      "下背一不舒服就先停，不要硬撐到姿勢散掉",
    ],
    alternatives: ["膝蓋平板", "死蟲式"],
  },
  {
    id: "side_plank",
    name: "側棒式",
    category: "core",
    part: "核心",
    equipment: "bodyweight",
    steps: [
      "側身以前臂撐地，手肘放在肩膀正下方，雙腳可上下疊放或前後錯開增加穩定。",
      "先把肩膀穩住，再把臀部抬離地面，讓耳朵、肩膀、骨盆、腳踝大致成一直線。",
      "上方骨盆不要往前或往後轉，維持側面朝向前方的穩定姿勢。",
      "停留指定秒數後慢慢放下，再換邊。",
    ],
    tips: [
      "肩膀遠離耳朵，避免聳肩撐",
      "如果太晃，雙腳前後錯開會更穩",
      "想像腰側往上提，不是只靠手硬撐",
    ],
    mistakes: [
      "屁股掉下去，身體變成彎折",
      "肩膀聳起、脖子很緊",
      "骨盆前後亂轉，失去側向穩定",
    ],
    breathing: "自然呼吸，穩穩撐住即可。",
    caution: [
      "太難就改屈膝版，先把側核心穩定做好",
      "肩膀不舒服時可改 Bird dog 或死蟲式",
    ],
    alternatives: ["屈膝側棒式", "Bird dog"],
  },
  {
    id: "bird_dog",
    name: "Bird dog",
    category: "core",
    part: "核心",
    equipment: "bodyweight",
    steps: [
      "四足跪姿準備，雙手在肩膀正下方、雙膝在髖部正下方，脊椎維持自然中立。",
      "先把腹部收緊，讓骨盆穩住，再慢慢伸出對側手與腳。",
      "手腳伸直時高度不用很高，只要身體穩定、不扭腰即可。",
      "回到中間後換邊，過程慢慢做，不要急。",
    ],
    tips: [
      "骨盆穩住比手腳抬多高更重要",
      "想像背上放了一杯水，不要讓它灑掉",
      "手腳伸長而不是抬很高",
    ],
    mistakes: [
      "腰左右亂晃，靠甩動作完成",
      "腿抬太高，讓下背過度拱起",
      "做太快，核心來不及穩定",
    ],
    breathing: "伸出去時吐氣，回來吸氣。",
    caution: [
      "平衡不好時可先只伸手或只伸腳",
      "下背不舒服就把幅度縮小，先求穩定",
    ],
    alternatives: ["只伸手", "只伸腳"],
  },
  {
    id: "leg_raise",
    name: "仰臥抬腿",
    category: "core",
    part: "核心",
    equipment: "bodyweight",
    steps: [
      "仰躺後雙腿伸直，雙手可放身體兩側或臀部下方輕輔助，但不要用手硬撐動作。",
      "先把腹部收緊，讓下背貼近地面，再慢慢把雙腿抬起。",
      "抬到自己能控制的位置後，再慢慢放下；下放過程要一直維持核心張力。",
      "腿放低前先確認下背還能穩定貼地，若腰要拱起就提早停止。",
    ],
    tips: [
      "慢慢放下比快速抬起更有訓練感",
      "幅度不用追到很大，腰穩最重要",
      "如果腳太重，可先改屈膝版本",
    ],
    mistakes: [
      "下背拱起來還繼續做",
      "用甩腿方式把動作做完",
      "脖子與肩膀過度緊繃",
    ],
    breathing: "抬腿吐氣，放下吸氣。",
    caution: [
      "下背不舒服時先改屈膝抬腿",
      "若核心穩不住，就先縮小幅度",
    ],
    alternatives: ["屈膝抬腿", "死蟲式"],
  },
  {
    id: "russian_twist",
    name: "Russian twist",
    category: "core",
    part: "核心",
    equipment: "bodyweight",
    steps: [
      "坐姿屈膝，腳跟可先踩地，身體微微後傾，先把核心收緊再開始轉體。",
      "雙手放在胸前或抱輕重量，左右轉動時由胸口與軀幹帶動，不是只甩手。",
      "轉到自己能穩定控制的角度即可，骨盆盡量保持穩定，不要整個人亂晃。",
      "全程維持平順節奏，先求穩定再求速度或次數。",
    ],
    tips: [
      "腳跟踩地會更容易先學會穩定",
      "胸口帶著轉，不是只有手左右擺",
      "角度小一點但穩定，效果通常更好",
    ],
    mistakes: [
      "身體整個亂晃，用甩動作交差",
      "只甩手臂，軀幹沒有真正轉動",
      "後傾太多導致下背圓掉、壓力過大",
    ],
    breathing: "左右轉動時自然吐吸，不要憋氣。",
    caution: [
      "下背不舒服時可把腳跟踩穩，並縮小角度",
      "先徒手做穩，再考慮抱重量",
    ],
    alternatives: ["腳跟踩地版本", "死蟲式"],
  },
];

const STORAGE_KEY = "simple-mounjaro-tracker-v3";
const SETTINGS_KEY = "simple-mounjaro-settings-v3";
const PEN_INVENTORY_KEY = "simple-mounjaro-pen-inventory-v1";
const PHOTO_RECORDS_KEY = "simple-mounjaro-photo-records-v1";

const WORKOUT_LEVEL_LABEL: Record<WorkoutLevel, string> = {
  low: "低階",
  mid: "中階",
  high: "高階",
};

const WORKOUT_STYLE_LABEL: Record<WorkoutStyle, string> = {
  easy: "輕鬆做",
  hard: "操爆版",
};

const WORKOUT_EQUIPMENT_LABEL: Record<WorkoutEquipment, string> = {
  bike: "飛輪",
  treadmill: "跑步機",
  kettlebell: "壺鈴",
};

function getWorkoutFocusSeed(todayStr: string) {
  if (!todayStr) return 0;
  return parseLocalDate(todayStr).getDay() % 3;
}

function getWorkoutDefinition(id: string) {
  return WORKOUT_DEFINITIONS.find((item) => item.id === id);
}

function getSexWorkoutLabel(sex: Sex) {
  return sex === "female" ? "女性" : "男性";
}

function getWorkoutStrengthPrescription(
  moveId: string,
  sex: Sex,
  level: WorkoutLevel,
  style: WorkoutStyle,
) {
  const baseSets: Record<WorkoutLevel, number> = {
    low: 2,
    mid: 3,
    high: 3,
  };
  const styleBonus = style === "hard" ? 1 : 0;
  const sets = baseSets[level] + styleBonus;

  const ranges: Record<string, Record<Sex, Record<WorkoutLevel, string>>> = {
    goblet_squat: {
      male: { low: "11.3–14.7 kg", mid: "14.7–18 kg", high: "18 kg" },
      female: { low: "7.9–11.3 kg", mid: "11.3–14.7 kg", high: "14.7–18 kg" },
    },
    kb_deadlift: {
      male: { low: "11.3–14.7 kg", mid: "14.7–18 kg", high: "18 kg" },
      female: { low: "7.9–11.3 kg", mid: "11.3–14.7 kg", high: "14.7–18 kg" },
    },
    kb_row: {
      male: { low: "7.9–11.3 kg", mid: "11.3–14.7 kg", high: "14.7–18 kg" },
      female: { low: "4.5–7.9 kg", mid: "7.9–11.3 kg", high: "11.3–14.7 kg" },
    },
    kb_shoulder_press: {
      male: { low: "7.9–11.3 kg", mid: "11.3–14.7 kg", high: "14.7 kg" },
      female: { low: "4.5–7.9 kg", mid: "7.9–11.3 kg", high: "11.3–14.7 kg" },
    },
    kb_floor_press: {
      male: { low: "7.9–11.3 kg", mid: "11.3–14.7 kg", high: "14.7–18 kg" },
      female: { low: "4.5–7.9 kg", mid: "7.9–11.3 kg", high: "11.3–14.7 kg" },
    },
    sumo_squat: {
      male: { low: "11.3–14.7 kg", mid: "14.7–18 kg", high: "18 kg" },
      female: { low: "7.9–11.3 kg", mid: "11.3–14.7 kg", high: "14.7–18 kg" },
    },
    split_squat: {
      male: { low: "徒手或 7.9 kg", mid: "7.9–11.3 kg", high: "11.3–14.7 kg" },
      female: { low: "徒手或 4.5 kg", mid: "4.5–7.9 kg", high: "7.9–11.3 kg" },
    },
    glute_bridge: {
      male: { low: "徒手", mid: "徒手或 7.9–11.3 kg", high: "7.9–14.7 kg" },
      female: { low: "徒手", mid: "徒手或 4.5–7.9 kg", high: "7.9–11.3 kg" },
    },
  };

  const repsMap: Record<string, Record<WorkoutLevel, string>> = {
    goblet_squat: { low: "10 下", mid: "10 下", high: "10~12 下" },
    kb_deadlift: { low: "12 下", mid: "10~12 下", high: "10 下" },
    kb_row: { low: "10 / 邊", mid: "10 / 邊", high: "12 / 邊" },
    kb_shoulder_press: { low: "8 下", mid: "8~10 下", high: "10 下" },
    kb_floor_press: { low: "10 下", mid: "10 下", high: "10~12 下" },
    sumo_squat: { low: "12 下", mid: "12 下", high: "12 下" },
    split_squat: { low: "8 / 邊", mid: "8~10 / 邊", high: "10 / 邊" },
    glute_bridge: { low: "12~15 下", mid: "15 下", high: "15~20 下" },
    dead_bug: { low: "8~10 / 邊", mid: "10~12 / 邊", high: "12~15 / 邊" },
    plank: { low: "20~30 秒", mid: "30~40 秒", high: "40~50 秒" },
    side_plank: { low: "20 秒 / 邊", mid: "20~30 秒 / 邊", high: "30~40 秒 / 邊" },
    bird_dog: { low: "10 / 邊", mid: "10~12 / 邊", high: "12~15 / 邊" },
    leg_raise: { low: "10 下", mid: "10~12 下", high: "12~15 下" },
    russian_twist: { low: "16 下", mid: "16~20 下", high: "20 下" },
  };

  const restMap: Record<string, Record<WorkoutLevel, string>> = {
    goblet_squat: { low: "60–90 秒", mid: "60–90 秒", high: "45–75 秒" },
    kb_deadlift: { low: "60–90 秒", mid: "60–90 秒", high: "45–75 秒" },
    kb_row: { low: "45–60 秒", mid: "45–60 秒", high: "30–45 秒" },
    kb_shoulder_press: { low: "45–60 秒", mid: "45–60 秒", high: "30–45 秒" },
    kb_floor_press: { low: "45–60 秒", mid: "45–60 秒", high: "30–45 秒" },
    sumo_squat: { low: "60–90 秒", mid: "60–90 秒", high: "45–75 秒" },
    split_squat: { low: "45–60 秒", mid: "45–60 秒", high: "30–45 秒" },
    glute_bridge: { low: "45 秒", mid: "45 秒", high: "30–45 秒" },
    dead_bug: { low: "30–45 秒", mid: "20–40 秒", high: "15–30 秒" },
    plank: { low: "30–45 秒", mid: "20–40 秒", high: "15–30 秒" },
    side_plank: { low: "30 秒", mid: "20–30 秒", high: "15–30 秒" },
    bird_dog: { low: "30 秒", mid: "20–30 秒", high: "15–30 秒" },
    leg_raise: { low: "30–45 秒", mid: "20–40 秒", high: "15–30 秒" },
    russian_twist: { low: "30–45 秒", mid: "20–40 秒", high: "15–30 秒" },
  };

  return {
    setsText: `${sets} 組`,
    repsText: repsMap[moveId]?.[level] || "10 下",
    restText: restMap[moveId]?.[level] || "45–60 秒",
    parameterText: ranges[moveId]?.[sex]?.[level] ? [`建議重量：${ranges[moveId][sex][level]}`] : undefined,
  };
}

function getWorkoutCardioPrescription(
  moveId: string,
  sex: Sex,
  level: WorkoutLevel,
  style: WorkoutStyle,
) {
  const easyMinutes: Record<WorkoutLevel, string> = {
    low: "20 分鐘",
    mid: "25 分鐘",
    high: "30 分鐘",
  };
  const hardMinutes: Record<WorkoutLevel, string> = {
    low: "25 分鐘",
    mid: "30 分鐘",
    high: "35~40 分鐘",
  };
  const durationText = style === "hard" ? hardMinutes[level] : easyMinutes[level];

  const cardioMap: Record<string, Record<Sex, Record<WorkoutLevel, string[]>>> = {
    bike_ride: {
      male: {
        low: ["阻力：4–5", "感受：微喘，可持續完成"],
        mid: ["阻力：5–6", "感受：腿有出力、微喘"],
        high: ["阻力：6–7", "感受：明顯喘，但能撐住"],
      },
      female: {
        low: ["阻力：3–4", "感受：微喘，可持續完成"],
        mid: ["阻力：4–5", "感受：腿有出力、微喘"],
        high: ["阻力：5–6", "感受：明顯喘，但能撐住"],
      },
    },
    treadmill_walk: {
      male: {
        low: ["速度：4.8–5.5 km/h", "坡度：1–3", "感受：微喘，可講完整句"],
        mid: ["速度：5.5–6.2 km/h", "坡度：2–4", "感受：微喘到中等"],
        high: ["速度：6.0–6.8 km/h", "坡度：2–5", "感受：明顯喘但可持續"],
      },
      female: {
        low: ["速度：4.2–5.0 km/h", "坡度：1–2", "感受：微喘，可講完整句"],
        mid: ["速度：5.0–5.8 km/h", "坡度：2–3", "感受：微喘到中等"],
        high: ["速度：5.5–6.2 km/h", "坡度：2–4", "感受：明顯喘但可持續"],
      },
    },
    treadmill_incline: {
      male: {
        low: ["速度：4.5–5.2 km/h", "坡度：3–5", "感受：腿有出力、微喘"],
        mid: ["速度：5.0–5.8 km/h", "坡度：4–6", "感受：微喘到中等"],
        high: ["速度：5.5–6.2 km/h", "坡度：5–7", "感受：明顯喘但能完成"],
      },
      female: {
        low: ["速度：4.0–4.8 km/h", "坡度：2–4", "感受：腿有出力、微喘"],
        mid: ["速度：4.5–5.2 km/h", "坡度：3–5", "感受：微喘到中等"],
        high: ["速度：5.0–5.8 km/h", "坡度：4–6", "感受：明顯喘但能完成"],
      },
    },
  };

  return {
    durationText,
    parameterText: cardioMap[moveId]?.[sex]?.[level] || [],
    feeling: cardioMap[moveId]?.[sex]?.[level]?.slice(-1)?.[0]?.replace("感受：", "") || "微喘，可持續完成",
  };
}

function buildWorkoutCard(
  moveId: string,
  sex: Sex,
  level: WorkoutLevel,
  style: WorkoutStyle,
) {
  const definition = getWorkoutDefinition(moveId);
  if (!definition) return null;

  const common = {
    id: definition.id,
    name: definition.name,
    category: definition.category,
    part: definition.part,
    equipment: definition.equipment,
    tutorial: {
      steps: definition.steps,
      tips: definition.tips,
      mistakes: definition.mistakes,
      breathing: definition.breathing,
      caution: definition.caution,
      alternatives: definition.alternatives,
    },
  };

  if (definition.category === "cardio") {
    const cardio = getWorkoutCardioPrescription(moveId, sex, level, style);
    return {
      ...common,
      durationText: cardio.durationText,
      parameterText: cardio.parameterText,
      feeling: cardio.feeling,
    } as WorkoutCard;
  }

  const strength = getWorkoutStrengthPrescription(moveId, sex, level, style);
  return {
    ...common,
    setsText: strength.setsText,
    repsText: strength.repsText,
    restText: strength.restText,
    parameterText: strength.parameterText,
  } as WorkoutCard;
}

function buildWorkoutPlan(
  sex: Sex,
  level: WorkoutLevel,
  style: WorkoutStyle,
  selectedEquipments: WorkoutEquipment[],
  todayStr: string,
) {
  const focusSeed = getWorkoutFocusSeed(todayStr);
  const focusLabel = ["下肢＋核心", "上肢＋核心", "全身燃脂"];
  const focus = focusLabel[focusSeed] || "全身燃脂";

  const hasBike = selectedEquipments.includes("bike");
  const hasTreadmill = selectedEquipments.includes("treadmill");
  const hasKb = selectedEquipments.includes("kettlebell");

  const cardioId = hasBike
    ? "bike_ride"
    : hasTreadmill
      ? focusSeed === 0
        ? "treadmill_incline"
        : "treadmill_walk"
      : null;

  const lowerMoves = hasKb
    ? ["goblet_squat", "kb_deadlift", "sumo_squat", "split_squat", "glute_bridge"]
    : ["glute_bridge", "split_squat"];
  const upperMoves = hasKb
    ? ["kb_row", "kb_shoulder_press", "kb_floor_press"]
    : [];
  const coreMoves = ["dead_bug", "plank", "side_plank", "bird_dog", "leg_raise", "russian_twist"];

  let moveIds: string[] = [];
  if (focusSeed === 0) {
    moveIds = [lowerMoves[0], lowerMoves[1] || lowerMoves[0], coreMoves[0], coreMoves[1]];
    if (style === "hard") moveIds.push(lowerMoves[2] || lowerMoves[0]);
  } else if (focusSeed === 1) {
    moveIds = [upperMoves[0] || lowerMoves[0], upperMoves[1] || coreMoves[0], coreMoves[0], coreMoves[2]];
    if (style === "hard") moveIds.push(upperMoves[2] || lowerMoves[1] || coreMoves[1]);
  } else {
    moveIds = [lowerMoves[0], upperMoves[0] || lowerMoves[1], coreMoves[0], coreMoves[3]];
    if (style === "hard") moveIds.push(lowerMoves[2] || upperMoves[1] || coreMoves[1]);
  }

  if (!hasKb) {
    moveIds = moveIds.filter((id) => {
      const d = getWorkoutDefinition(id);
      return d && d.equipment !== "kettlebell";
    });
    if (!moveIds.length) moveIds = ["glute_bridge", "dead_bug", "plank", "bird_dog"];
  }

  const cards = [
    ...(cardioId ? [buildWorkoutCard(cardioId, sex, level, style)] : []),
    ...moveIds.map((id) => buildWorkoutCard(id, sex, level, style)),
  ].filter(Boolean) as WorkoutCard[];

  const equipmentText = selectedEquipments.length
    ? selectedEquipments.map((item) => WORKOUT_EQUIPMENT_LABEL[item]).join("＋")
    : "徒手";

  const estimatedMinutes =
    style === "easy"
      ? level === "low"
        ? "25~35 分鐘"
        : level === "mid"
          ? "30~40 分鐘"
          : "35~45 分鐘"
      : level === "low"
        ? "35~45 分鐘"
        : level === "mid"
          ? "40~50 分鐘"
          : "45~60 分鐘";

  return {
    title: `${getSexWorkoutLabel(sex)}｜${WORKOUT_LEVEL_LABEL[level]}｜${WORKOUT_STYLE_LABEL[style]}`,
    subtitle: `今日重點：${focus}｜使用器材：${equipmentText}`,
    estimatedMinutes,
    focus,
    cards,
  } satisfies WorkoutPlan;
}

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

function getWeekStart(dateStr: string) {
  const d = parseLocalDate(dateStr);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return formatLocalDate(d);
}

function getMonthStart(dateStr: string) {
  const d = parseLocalDate(dateStr);
  d.setDate(1);
  return formatLocalDate(d);
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

function getNextShotDate(
  baseShotDate: string,
  intervalDays: number,
  todayStr: string,
) {
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
  return (
    [...shotEntries].sort(
      (a, b) =>
        parseLocalDate(a.date).getTime() - parseLocalDate(b.date).getTime(),
    )[shotEntries.length - 1]?.date || ""
  );
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

function getMetricTrendLabel(
  current: number,
  previous: number,
  lowerIsBetter = false,
) {
  if (!current || !previous) return "資料不足";
  const diff = +(current - previous).toFixed(1);
  if (Math.abs(diff) < 0.2) return "大致持平";
  if (lowerIsBetter)
    return diff < 0 ? `下降 ${Math.abs(diff)}` : `上升 ${diff}`;
  return diff > 0 ? `上升 ${diff}` : `下降 ${Math.abs(diff)}`;
}

function getIdealWeightRange(heightCm: string) {
  const h = num(heightCm) / 100;
  if (!h) return { low: 0, high: 0 };
  return {
    low: +(18.5 * h * h).toFixed(1),
    high: +(24 * h * h).toFixed(1),
  };
}

type MealAdjustment = "-0.5" | "0" | "+0.5" | "+1";
type MealTierKey = "1200" | "1400" | "1600" | "1800" | "2000";

function getMealAdjustmentLabel(adjust: MealAdjustment) {
  if (adjust === "+1") return "加量 1 單位（約 100 kcal）";
  if (adjust === "+0.5") return "加量 0.5 單位（約 50 kcal）";
  if (adjust === "-0.5") return "減量 0.5 單位（約 50 kcal）";
  return "標準份量";
}

function resolveMealTier(targetCalories: number) {
  if (targetCalories <= 1250)
    return {
      tier: "1200" as MealTierKey,
      adjust: "0" as MealAdjustment,
      label: "1200 kcal 基礎版",
    };
  if (targetCalories <= 1350)
    return {
      tier: "1200" as MealTierKey,
      adjust: "+1" as MealAdjustment,
      label: "1200 kcal 基礎版 + 微加量",
    };
  if (targetCalories <= 1450)
    return {
      tier: "1400" as MealTierKey,
      adjust: "0" as MealAdjustment,
      label: "1400 kcal 基礎版",
    };
  if (targetCalories <= 1550)
    return {
      tier: "1400" as MealTierKey,
      adjust: "+1" as MealAdjustment,
      label: "1400 kcal 基礎版 + 微加量",
    };
  if (targetCalories <= 1650)
    return {
      tier: "1600" as MealTierKey,
      adjust: "0" as MealAdjustment,
      label: "1600 kcal 基礎版",
    };
  if (targetCalories <= 1750)
    return {
      tier: "1600" as MealTierKey,
      adjust: "+1" as MealAdjustment,
      label: "1600 kcal 基礎版 + 微加量",
    };
  if (targetCalories <= 1850)
    return {
      tier: "1800" as MealTierKey,
      adjust: "0" as MealAdjustment,
      label: "1800 kcal 基礎版",
    };
  if (targetCalories <= 1950)
    return {
      tier: "1800" as MealTierKey,
      adjust: "+1" as MealAdjustment,
      label: "1800 kcal 基礎版 + 微加量",
    };
  return {
    tier: "2000" as MealTierKey,
    adjust: "0" as MealAdjustment,
    label: "2000 kcal 基礎版",
  };
}

function getMealAdjustmentGuide(
  adjust: MealAdjustment,
  mealMoment: "早餐" | "午餐" | "晚餐" | "加餐",
  isFemale: boolean,
) {
  if (adjust === "0") return [];
  if (adjust === "-0.5") {
    return [
      mealMoment === "午餐" || mealMoment === "晚餐"
        ? "主食減少 1/4 份"
        : "本餐少 1 小份主食或水果",
    ];
  }

  const femaleChoice =
    mealMoment === "早餐"
      ? ["全麥吐司 +1 片", "或 無糖豆漿 +150ml"]
      : mealMoment === "午餐"
        ? ["飯 +50g", "或 地瓜 +60g"]
        : mealMoment === "晚餐"
          ? ["地瓜 +60g", "或 豆腐 +1/3 盒"]
          : ["無糖優格 1/2~1 份", "或 茶葉蛋 +1 顆"];

  const maleChoice =
    mealMoment === "早餐"
      ? ["全麥吐司 +1~2 片", "或 無糖豆漿 +250ml"]
      : mealMoment === "午餐"
        ? ["飯 +70~100g", "或 地瓜 +80~100g"]
        : mealMoment === "晚餐"
          ? ["地瓜 +80~100g", "或 豆腐 +1/2 盒"]
          : ["無糖優格 1 份", "或 茶葉蛋 +1 顆 + 小水果"];

  const base = isFemale ? femaleChoice : maleChoice;

  if (adjust === "+0.5") {
    return [`本餐微加量：${base[0]}`];
  }

  return [`本餐可擇一加量：${base[0]}`, base[1] ? `或 ${base[1]}` : ""].filter(
    Boolean,
  );
}

function getDailyMenuSeed() {
  const now = new Date();
  return now.getDay();
}

function buildFlexibleMealItems(
  baseItems: string[],
  mealMoment: "早餐" | "午餐" | "晚餐" | "加餐",
  adjust: MealAdjustment,
  isFemale: boolean,
  note?: string,
) {
  const adjustItems = getMealAdjustmentGuide(adjust, mealMoment, isFemale);
  return [...baseItems, ...adjustItems, ...(note ? [note] : [])];
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
  const tier = resolveMealTier(targetCalories);
  const daySeed = getDailyMenuSeed();

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

  const mealTemplates: Record<MealTierKey, MealPlan[]> = {
    "1200": [
      {
        title: "第 1 天｜清爽高蛋白版",
        meals: [
          {
            name: "早餐",
            items: nausea
              ? ["無糖豆漿 250ml", "蘇打餅 2 片", "水煮蛋 1 顆"]
              : ["無糖豆漿", "茶葉蛋 2 顆", "全麥吐司 1 片"],
          },
          {
            name: "午餐",
            items: severeCraving
              ? ["雞胸便當 1 份", "飯 1/3 碗", "青菜加量"]
              : ["雞胸肉 100g", "糙米飯 1/3 碗", "青菜 2 份", "豆腐 1/2 盒"],
          },
          {
            name: "晚餐",
            items: lowAppetite
              ? ["蒸蛋 1 份", "嫩豆腐 1 盒", "青菜 2 份"]
              : ["鯛魚 / 白肉魚 100g", "地瓜 80g", "青菜 2 份"],
          },
          {
            name: "加餐",
            items: constipation
              ? ["奇異果 1 顆", "水 500ml"]
              : ["無糖優格 1 份"],
          },
        ],
      },
      {
        title: "第 2 天｜超商方便版",
        meals: [
          { name: "早餐", items: ["茶葉蛋 2 顆", "無糖豆漿 1 瓶"] },
          {
            name: "午餐",
            items: ["舒肥雞胸 1 份", "沙拉 1 盒", "飯糰半個到 1 個"],
          },
          {
            name: "晚餐",
            items: ["關東煮：白蘿蔔、豆腐、蛋", "再加雞胸或豆干 1 份"],
          },
          {
            name: "加餐",
            items: severeCraving ? ["茶葉蛋 1 顆"] : ["毛豆 1 份"],
          },
        ],
      },
      {
        title: "第 3 天｜家常台式版",
        meals: [
          { name: "早餐", items: ["地瓜 1 小條", "水煮蛋 2 顆"] },
          { name: "午餐", items: ["滷雞腿去皮", "飯 1/3 碗", "燙青菜 2 份"] },
          { name: "晚餐", items: ["豆腐炒瘦肉", "高麗菜 / 菇類 2 份"] },
          { name: "加餐", items: ["無糖優格或小番茄"] },
        ],
      },
      {
        title: "第 4 天｜食慾差友善版",
        meals: [
          { name: "早餐", items: ["無糖優格 1 碗", "香蕉半根"] },
          {
            name: "午餐",
            items: ["蒸蛋", "嫩豆腐", "清湯", "少量飯 1/4~1/3 碗"],
          },
          { name: "晚餐", items: ["魚片湯", "青菜 2 份", "地瓜半條"] },
          { name: "加餐", items: ["豆漿 200~250ml"] },
        ],
      },
      {
        title: "第 5 天｜日式輕盈版",
        meals: [
          { name: "早餐", items: ["味噌湯", "水煮蛋 2 顆"] },
          { name: "午餐", items: ["鮭魚 100g", "飯 1/3 碗", "燙青菜 2 份"] },
          { name: "晚餐", items: ["豆腐 / 蒟蒻 / 菇類鍋", "瘦肉 1 份"] },
          { name: "加餐", items: ["毛豆 1 份"] },
        ],
      },
      {
        title: "第 6 天｜低碳平衡版",
        meals: [
          { name: "早餐", items: ["無糖豆漿", "茶葉蛋 2 顆"] },
          { name: "午餐", items: ["雞胸肉 100g", "酪梨少量", "青菜 2 份"] },
          { name: "晚餐", items: ["蝦仁 / 魚肉", "豆腐 1 盒", "青菜 2 份"] },
          { name: "加餐", items: ["堅果小把"] },
        ],
      },
      {
        title: "第 7 天｜聚餐收斂版",
        meals: [
          { name: "早餐", items: ["茶葉蛋 2 顆", "黑咖啡 / 無糖茶"] },
          {
            name: "午餐",
            items: ["外食正常吃，但主食先抓半份以下", "先吃蛋白質與青菜"],
          },
          { name: "晚餐", items: ["回歸清淡：豆腐、魚肉、蔬菜"] },
          { name: "加餐", items: ["真的餓再吃優格或毛豆"] },
        ],
      },
    ],
    "1400": [
      {
        title: "第 1 天｜標準減脂版",
        meals: [
          {
            name: "早餐",
            items: nausea
              ? ["無糖豆漿 250ml", "蘇打餅 2~3 片", "水煮蛋 1 顆"]
              : ["無糖豆漿", "茶葉蛋 2 顆", "全麥吐司 2 片"],
          },
          { name: "午餐", items: ["雞胸肉 120g", "糙米飯半碗", "青菜 2 份"] },
          {
            name: "晚餐",
            items: lowAppetite
              ? ["蒸蛋", "嫩豆腐 1 盒", "地瓜半條"]
              : ["魚肉 120g", "地瓜 100g", "青菜 2 份"],
          },
          {
            name: "加餐",
            items: severeCraving
              ? ["茶葉蛋 1 顆", "無糖豆漿 1 瓶"]
              : ["無糖優格 1 份"],
          },
        ],
      },
      {
        title: "第 2 天｜三明治外食版",
        meals: [
          { name: "早餐", items: ["雞胸三明治 1 份", "無糖咖啡"] },
          { name: "午餐", items: ["便當選烤雞 / 滷牛", "飯半碗", "青菜加量"] },
          {
            name: "晚餐",
            items: ["小火鍋：肉 + 豆腐 + 菜", "主食 1/3~1/2 份"],
          },
          { name: "加餐", items: ["毛豆或茶葉蛋"] },
        ],
      },
      {
        title: "第 3 天｜台式家常版",
        meals: [
          { name: "早餐", items: ["地瓜", "水煮蛋 2 顆", "無糖豆漿"] },
          { name: "午餐", items: ["滷牛腱", "飯半碗", "青菜 2 份"] },
          { name: "晚餐", items: ["豬里肌 / 雞腿排去皮", "青菜 2 份", "菇類"] },
          { name: "加餐", items: ["無糖優格 / 小水果 擇一"] },
        ],
      },
      {
        title: "第 4 天｜日式清爽版",
        meals: [
          { name: "早餐", items: ["希臘優格", "香蕉 1 根"] },
          { name: "午餐", items: ["鮭魚", "飯半碗", "味噌湯", "青菜"] },
          { name: "晚餐", items: ["壽喜燒風牛肉", "大量青菜", "主食少量"] },
          { name: "加餐", items: ["毛豆"] },
        ],
      },
      {
        title: "第 5 天｜超商實用版",
        meals: [
          { name: "早餐", items: ["茶葉蛋 2 顆", "烤地瓜", "無糖拿鐵"] },
          { name: "午餐", items: ["雞胸肉 1 份", "沙拉 1 盒", "飯糰 1 個"] },
          { name: "晚餐", items: ["關東煮 + 豆腐 + 蛋", "再補雞胸或豆干"] },
          { name: "加餐", items: ["高蛋白飲 / 無糖優格 擇一"] },
        ],
      },
      {
        title: "第 6 天｜低食慾少量多餐版",
        meals: [
          { name: "早餐", items: ["無糖豆漿 250ml", "水煮蛋 2 顆"] },
          { name: "午餐", items: ["蒸蛋", "嫩豆腐", "地瓜半條"] },
          { name: "晚餐", items: ["魚湯", "青菜 2 份", "飯 1/3 碗"] },
          { name: "加餐", items: ["優格 1 份", "或 毛豆 1 份"] },
        ],
      },
      {
        title: "第 7 天｜假日彈性版",
        meals: [
          { name: "早餐", items: ["鮪魚蛋吐司", "無糖茶"] },
          { name: "午餐", items: ["聚餐可正常吃 1 餐，但主食別超 1 碗"] },
          { name: "晚餐", items: ["回歸清淡：雞胸 / 豆腐 / 蔬菜"] },
          { name: "加餐", items: ["真的餓再吃茶葉蛋"] },
        ],
      },
    ],
    "1600": [
      {
        title: "第 1 天｜高蛋白標準版",
        meals: [
          { name: "早餐", items: ["無糖豆漿", "茶葉蛋 2 顆", "全麥吐司 2 片"] },
          {
            name: "午餐",
            items: ["雞胸肉 120~150g", "飯半碗到 3/4 碗", "青菜 2 份"],
          },
          {
            name: "晚餐",
            items: ["魚肉 / 瘦牛 120g", "地瓜 100g", "青菜 2 份"],
          },
          { name: "加餐", items: ["無糖優格 1 份", "或 毛豆 1 份"] },
        ],
      },
      {
        title: "第 2 天｜日常外食版",
        meals: [
          { name: "早餐", items: ["雞胸三明治", "黑咖啡"] },
          {
            name: "午餐",
            items: ["便當選烤雞 / 滷排", "飯半碗到 3/4 碗", "青菜加量"],
          },
          { name: "晚餐", items: ["小火鍋：肉片 + 豆腐 + 菜", "主食半份"] },
          { name: "加餐", items: ["茶葉蛋 1 顆", "水果 1 份"] },
        ],
      },
      {
        title: "第 3 天｜家常飽足版",
        meals: [
          { name: "早餐", items: ["地瓜", "蛋 2 顆", "無糖豆漿"] },
          {
            name: "午餐",
            items: ["滷牛腱 / 雞腿排", "飯 3/4 碗", "青菜 2 份"],
          },
          { name: "晚餐", items: ["豬里肌 / 魚肉", "菇類", "地瓜 100g"] },
          { name: "加餐", items: ["優格 / 毛豆"] },
        ],
      },
      {
        title: "第 4 天｜訓練日支援版",
        meals: [
          { name: "早餐", items: ["燕麥半碗", "水煮蛋 2 顆", "無糖優格"] },
          { name: "午餐", items: ["雞胸肉 150g", "飯 3/4 碗", "青菜 2 份"] },
          { name: "晚餐", items: ["鮭魚 120g", "地瓜 100~120g", "青菜"] },
          { name: "加餐", items: ["高蛋白飲 1 份"] },
        ],
      },
      {
        title: "第 5 天｜台式便當版",
        meals: [
          { name: "早餐", items: ["鮪魚蛋吐司", "無糖拿鐵"] },
          {
            name: "午餐",
            items: ["便當：雞腿去皮 / 滷牛", "飯半碗到 3/4 碗", "青菜多"],
          },
          { name: "晚餐", items: ["燙青菜", "豆腐", "瘦肉湯"] },
          { name: "加餐", items: ["茶葉蛋 1 顆", "水果 1 份"] },
        ],
      },
      {
        title: "第 6 天｜超商進階版",
        meals: [
          { name: "早餐", items: ["茶葉蛋 2 顆", "烤地瓜", "無糖豆漿"] },
          { name: "午餐", items: ["雞胸 1 份", "沙拉 1 盒", "飯糰 1 個"] },
          { name: "晚餐", items: ["關東煮 + 豆腐 + 蛋", "再補一份雞胸"] },
          { name: "加餐", items: ["無糖優格", "堅果小把"] },
        ],
      },
      {
        title: "第 7 天｜聚餐可控版",
        meals: [
          { name: "早餐", items: ["蛋 2 顆", "無糖咖啡", "吐司 2 片"] },
          { name: "午餐", items: ["聚餐正常吃，但先蛋白質、再主食"] },
          { name: "晚餐", items: ["回歸清淡：魚肉 / 豆腐 / 菜"] },
          { name: "加餐", items: ["若聚餐較油，晚上不再補零食"] },
        ],
      },
    ],
    "1800": [
      {
        title: "第 1 天｜男性常用減脂版",
        meals: [
          {
            name: "早餐",
            items: ["無糖豆漿 375ml", "蛋 2 顆", "全麥吐司 3 片"],
          },
          {
            name: "午餐",
            items: ["雞胸肉 150g", "飯 3/4 碗到 1 碗", "青菜 2~3 份"],
          },
          {
            name: "晚餐",
            items: ["魚 / 牛 / 豬里肌 150g", "地瓜 150g", "青菜 2 份"],
          },
          { name: "加餐", items: ["優格 1 份", "水果 1 份"] },
        ],
      },
      {
        title: "第 2 天｜外食工作版",
        meals: [
          { name: "早餐", items: ["三明治 1 份", "無糖咖啡"] },
          {
            name: "午餐",
            items: ["便當選烤雞 / 滷牛", "飯 3/4~1 碗", "青菜加量"],
          },
          { name: "晚餐", items: ["小火鍋 + 主食半份到 1 份"] },
          { name: "加餐", items: ["茶葉蛋 + 無糖豆漿"] },
        ],
      },
      {
        title: "第 3 天｜訓練支援版",
        meals: [
          { name: "早餐", items: ["燕麥 1 碗", "蛋 2 顆", "無糖優格"] },
          { name: "午餐", items: ["雞胸肉 150g", "飯 1 碗", "青菜 2 份"] },
          { name: "晚餐", items: ["鮭魚 / 牛肉 150g", "地瓜 150g", "青菜"] },
          { name: "加餐", items: ["高蛋白飲 1 份", "水果 1 份"] },
        ],
      },
      {
        title: "第 4 天｜台式飽足版",
        meals: [
          { name: "早餐", items: ["地瓜", "蛋 2 顆", "豆漿"] },
          { name: "午餐", items: ["雞腿排去皮", "飯 1 碗", "青菜 2 份"] },
          { name: "晚餐", items: ["豬里肌 / 豆腐", "菇類", "地瓜 100g"] },
          { name: "加餐", items: ["毛豆", "或 優格"] },
        ],
      },
      {
        title: "第 5 天｜超商大份量版",
        meals: [
          { name: "早餐", items: ["茶葉蛋 2 顆", "烤地瓜", "無糖拿鐵"] },
          { name: "午餐", items: ["雞胸 1 份", "沙拉", "飯糰 1 個", "豆漿"] },
          { name: "晚餐", items: ["關東煮 + 豆腐 + 蛋 + 雞胸"] },
          { name: "加餐", items: ["堅果小把", "水果 1 份"] },
        ],
      },
      {
        title: "第 6 天｜日式定食版",
        meals: [
          { name: "早餐", items: ["優格", "香蕉", "吐司 2 片"] },
          { name: "午餐", items: ["鮭魚定食，飯 3/4 碗", "味噌湯"] },
          { name: "晚餐", items: ["壽喜燒風牛肉", "豆腐", "青菜"] },
          { name: "加餐", items: ["茶葉蛋 1 顆"] },
        ],
      },
      {
        title: "第 7 天｜假日彈性版",
        meals: [
          { name: "早餐", items: ["鮪魚蛋吐司", "黑咖啡"] },
          { name: "午餐", items: ["聚餐正常吃 1 餐，但炸物與甜點擇一"] },
          { name: "晚餐", items: ["回歸乾淨：魚肉 / 雞胸 / 豆腐 / 青菜"] },
          { name: "加餐", items: ["依飢餓度補優格或水果"] },
        ],
      },
    ],
    "2000": [
      {
        title: "第 1 天｜高活動量減脂版",
        meals: [
          {
            name: "早餐",
            items: ["無糖豆漿", "蛋 2 顆", "全麥吐司 3 片", "香蕉 1 根"],
          },
          {
            name: "午餐",
            items: ["雞胸 / 牛肉 150~180g", "飯 1 碗", "青菜 2~3 份"],
          },
          { name: "晚餐", items: ["魚肉 150g", "地瓜 150~200g", "青菜 2 份"] },
          { name: "加餐", items: ["優格 1 份", "水果 1 份", "堅果少量"] },
        ],
      },
      {
        title: "第 2 天｜訓練恢復版",
        meals: [
          { name: "早餐", items: ["燕麥 1 碗", "蛋 2 顆", "優格"] },
          { name: "午餐", items: ["雞胸肉 180g", "飯 1 碗", "青菜 2 份"] },
          { name: "晚餐", items: ["鮭魚 150g", "地瓜 180g", "青菜"] },
          { name: "加餐", items: ["高蛋白飲", "水果"] },
        ],
      },
      {
        title: "第 3 天｜外食穩定版",
        meals: [
          { name: "早餐", items: ["三明治 1 份", "無糖咖啡", "茶葉蛋 1 顆"] },
          { name: "午餐", items: ["便當選烤雞 / 滷牛", "飯 1 碗", "青菜多"] },
          {
            name: "晚餐",
            items: ["小火鍋：肉 + 豆腐 + 菜", "主食半份到 1 份"],
          },
          { name: "加餐", items: ["無糖豆漿", "水果 1 份"] },
        ],
      },
      {
        title: "第 4 天｜家常大份量版",
        meals: [
          { name: "早餐", items: ["地瓜", "蛋 2 顆", "豆漿", "吐司 2 片"] },
          { name: "午餐", items: ["雞腿排去皮", "飯 1 碗", "青菜 2 份"] },
          { name: "晚餐", items: ["豬里肌 / 魚肉 150g", "菇類", "地瓜 150g"] },
          { name: "加餐", items: ["毛豆", "優格"] },
        ],
      },
      {
        title: "第 5 天｜超商組合版",
        meals: [
          {
            name: "早餐",
            items: ["茶葉蛋 2 顆", "烤地瓜", "無糖拿鐵", "香蕉"],
          },
          {
            name: "午餐",
            items: ["雞胸 1 份", "沙拉 1 盒", "飯糰 1 個", "豆漿"],
          },
          { name: "晚餐", items: ["關東煮 + 雞胸 + 豆腐 + 蛋"] },
          { name: "加餐", items: ["優格", "堅果", "水果"] },
        ],
      },
      {
        title: "第 6 天｜日式定食進階版",
        meals: [
          { name: "早餐", items: ["優格", "香蕉", "吐司 3 片"] },
          { name: "午餐", items: ["鮭魚定食，飯 1 碗", "味噌湯"] },
          { name: "晚餐", items: ["壽喜燒風牛肉", "豆腐", "蔬菜", "主食少量"] },
          { name: "加餐", items: ["茶葉蛋", "水果"] },
        ],
      },
      {
        title: "第 7 天｜聚餐緩衝版",
        meals: [
          { name: "早餐", items: ["蛋 2 顆", "吐司 2 片", "無糖茶"] },
          { name: "午餐", items: ["聚餐正常吃，但甜點與炸物不要雙選"] },
          { name: "晚餐", items: ["回歸清淡高蛋白：雞胸 / 魚 / 豆腐 / 青菜"] },
          { name: "加餐", items: ["依需要補優格或水果"] },
        ],
      },
    ],
  };

  const selectedPlans = mealTemplates[tier.tier];
  const todayPlan = selectedPlans[daySeed % selectedPlans.length];
  const altPlan = selectedPlans[(daySeed + 2) % selectedPlans.length];
  const recoveryPlan = selectedPlans[(daySeed + 4) % selectedPlans.length];

  const enrichPlan = (plan: MealPlan, label: string): MealPlan => ({
    title: `${label}｜${plan.title}｜${tier.label}｜${getMealAdjustmentLabel(tier.adjust)}｜${isFemale ? "女性版" : "男性版"}`,
    meals: plan.meals.map((meal) => ({
      name: meal.name,
      items: buildFlexibleMealItems(
        meal.items,
        meal.name as "早餐" | "午餐" | "晚餐" | "加餐",
        meal.name === "加餐"
          ? tier.adjust === "+1"
            ? "+0.5"
            : tier.adjust
          : tier.adjust,
        isFemale,
        meal.name === "加餐" && constipation
          ? "便秘時今天至少補水 500ml"
          : undefined,
      ),
    })),
  });

  const symptomPlan: MealPlan = {
    title: `症狀修正版｜${nausea ? "噁心友善" : lowAppetite ? "低食慾少量多餐" : severeCraving ? "高嘴饞控量版" : "平衡修正"}｜${tier.label}`,
    meals: [
      {
        name: "早餐",
        items: nausea
          ? ["無糖豆漿 200~250ml", "蘇打餅 2~4 片", "蛋 1 顆"]
          : lowAppetite
            ? ["優格 / 豆漿 擇一", "蛋 2 顆"]
            : ["蛋白質優先", "主食按今日份量吃"],
      },
      {
        name: "午餐",
        items: severeCraving
          ? ["先吃雞胸 / 豆腐 / 滷蛋", "主食照份量，不要額外加炸物"]
          : ["正常吃正餐，先蛋白質與蔬菜"],
      },
      {
        name: "晚餐",
        items: nausea
          ? ["清湯、蒸蛋、豆腐、魚肉為主", "避免油炸與太甜"]
          : constipation
            ? ["蔬菜 2 份 + 水 500ml", "奇異果 / 毛豆擇一"]
            : ["主食控制在今日份量內", "避免宵夜延伸"],
      },
      {
        name: "加餐",
        items: severeCraving
          ? ["茶葉蛋、毛豆、無糖優格先備好", "真的想吃零食時先吃蛋白質"]
          : ["依飢餓度補 1 小份高蛋白點心"],
      },
    ],
  };

  return [
    enrichPlan(todayPlan, "今日推薦"),
    enrichPlan(altPlan, "替代菜單"),
    enrichPlan(recoveryPlan, "換口味菜單"),
    symptomPlan,
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

function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("讀取圖片失敗"));
    reader.readAsDataURL(file);
  });
}

function getMuscleRateValue(weight: number, muscleMass: number) {
  if (!weight || !muscleMass) return 0;
  return +((muscleMass / weight) * 100).toFixed(1);
}

function getMuscleRateFromEntry(entry?: Partial<Entry> | null) {
  if (!entry) return 0;
  const direct = num((entry as any).muscleRate);
  if (direct > 0) return direct;
  return getMuscleRateValue(num(entry.weight), num(entry.muscleMass));
}

function estimateETA(
  latestWeight: number,
  goalWeight: number,
  weeklyLoss: number,
) {
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

type BodyCompRowProps = {
  label: string;
  value: number;
  min: number;
  normalMin: number;
  normalMax: number;
  max: number;
  unit?: string;
  colorClass?: string;
  idealText?: string;
};

function clampPercent(value: number, min: number, max: number) {
  if (max <= min) return 0;
  return Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100));
}

function getBMRByLeanMass(weight: number, bodyFatPct: number, fatMass: number) {
  let leanMass = 0;
  if (fatMass > 0 && weight > fatMass) {
    leanMass = weight - fatMass;
  } else if (weight > 0 && bodyFatPct > 0 && bodyFatPct < 100) {
    leanMass = weight * (1 - bodyFatPct / 100);
  }
  if (!leanMass || leanMass <= 0) return 0;
  return Math.round(370 + 21.6 * leanMass);
}

const COMPOSITE_METRICS = [
  { key: "weight", title: "體重", unit: "kg" },
  { key: "bodyFatPct", title: "體脂率", unit: "%" },
  { key: "fatMass", title: "脂肪重", unit: "kg" },
  { key: "muscleRate", title: "肌肉率", unit: "%" },
  { key: "muscleMass", title: "肌肉量", unit: "kg" },
  { key: "visceralFat", title: "內臟脂肪", unit: "" },
  { key: "bodyWater", title: "水分", unit: "%" },
] as const;

const METRIC_COLORS: Record<string, string> = {
  weight: "#e2e8f0",
  bodyFatPct: "#7c3aed",
  fatMass: "#dc2626",
  muscleRate: "#059669",
  muscleMass: "#ea580c",
  visceralFat: "#cbd5e1",
  bodyWater: "#0284c7",
};

type MetricLineCardProps = {
  title: string;
  data: Array<Record<string, any>>;
  dataKey: string;
  unit?: string;
  goalValue?: number | null;
  onExpand?: () => void;
  height?: number;
  strokeColor?: string;
};

function MetricLineCard({
  title,
  data,
  dataKey,
  unit = "",
  goalValue = null,
  onExpand,
  height = 220,
  strokeColor = "#0f172a",
}: MetricLineCardProps) {
  const filteredData = useMemo(
    () =>
      data.filter((row) => {
        const value = Number(row[dataKey]);
        return Number.isFinite(value) && value > 0;
      }),
    [data, dataKey],
  );

  const hasData = filteredData.length > 0;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle>{title}</CardTitle>
        {onExpand ? (
          <Button type="button" variant="outline" size="sm" onClick={onExpand}>
            <Expand className="h-4 w-4 mr-1" />
            放大
          </Button>
        ) : null}
      </CardHeader>
      <CardContent>
        {!hasData ? (
          <div
            className="flex items-center justify-center text-sm text-slate-500"
            style={{ height }}
          >
            尚無足夠資料可顯示圖表
          </div>
        ) : (
          <div style={{ width: "100%", height }}>
            <ResponsiveContainer>
              <LineChart data={filteredData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip
                  formatter={(value: any) => [
                    `${Number(value || 0).toFixed(1)}${unit}`,
                    title,
                  ]}
                />
                {goalValue !== null && goalValue > 0 ? (
                  <ReferenceLine
                    y={goalValue}
                    stroke="#ef4444"
                    strokeDasharray="4 4"
                  />
                ) : null}
                <Line
                  type="monotone"
                  dataKey={dataKey}
                  name={title}
                  stroke={strokeColor}
                  strokeWidth={2}
                  dot={false}
                  isAnimationActive={false}
                  connectNulls={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

type CompositeMetricsCardProps = {
  title: string;
  data: Array<Record<string, any>>;
  onExpand?: () => void;
  height?: number;
  fullscreen?: boolean;
  activeKeys?: string[];
  onToggleKey?: (key: string) => void;
};

function CompositeMetricsCard({
  title,
  data,
  onExpand,
  height = 260,
  fullscreen = false,
  activeKeys,
  onToggleKey,
}: CompositeMetricsCardProps) {
  const lines = [
    { key: "weightTrend", name: "體重", color: METRIC_COLORS.weight },
    { key: "bodyFatPctTrend", name: "體脂率", color: METRIC_COLORS.bodyFatPct },
    { key: "fatMassTrend", name: "脂肪重", color: METRIC_COLORS.fatMass },
    { key: "muscleRateTrend", name: "肌肉率", color: METRIC_COLORS.muscleRate },
    { key: "muscleMassTrend", name: "肌肉量", color: METRIC_COLORS.muscleMass },
    {
      key: "visceralFatTrend",
      name: "內臟脂肪",
      color: METRIC_COLORS.visceralFat,
    },
    { key: "bodyWaterTrend", name: "水分", color: METRIC_COLORS.bodyWater },
  ];

  const visibleLines = lines.filter((line) =>
    activeKeys && activeKeys.length ? activeKeys.includes(line.key) : true,
  );

  const filteredData = useMemo(
    () =>
      data.filter((row) =>
        visibleLines.some((line) => {
          const value = Number(row[line.key]);
          return Number.isFinite(value) && value > 0;
        }),
      ),
    [data, visibleLines],
  );

  const yDomain = useMemo(() => {
    const values = filteredData.flatMap((row) =>
      visibleLines
        .map((line) => Number(row[line.key]))
        .filter((value) => Number.isFinite(value) && value > 0),
    );

    if (!values.length) return [80, 120] as [number, number];

    const min = Math.min(...values);
    const max = Math.max(...values);
    const padding = Math.max(3, (max - min) * 0.15);

    return [
      Math.max(0, Math.floor(min - padding)),
      Math.ceil(max + padding),
    ] as [number, number];
  }, [filteredData, visibleLines]);

  const hasData = filteredData.length > 0 && visibleLines.length > 0;

  return (
    <Card className={fullscreen ? "h-full" : undefined}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <div className="space-y-1">
          <CardTitle>{title}</CardTitle>
          <div className="text-xs text-slate-500">
            各指標已換算成「第一筆資料 =
            100」的相對趨勢，只看走勢，不看原始單位大小。
          </div>
        </div>
        {onExpand ? (
          <Button type="button" variant="outline" size="sm" onClick={onExpand}>
            <Expand className="h-4 w-4 mr-1" />
            放大
          </Button>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-3">
        {!hasData ? (
          <div
            className="flex items-center justify-center text-sm text-slate-500"
            style={{ height }}
          >
            尚無足夠資料可顯示綜合曲線圖
          </div>
        ) : (
          <>
            <div className="flex flex-wrap gap-2 text-xs text-slate-600">
              {lines.map((line) => {
                const active =
                  activeKeys && activeKeys.length
                    ? activeKeys.includes(line.key)
                    : true;
                return (
                  <button
                    key={line.key}
                    type="button"
                    onClick={() => onToggleKey?.(line.key)}
                    className={`rounded-full border px-2 py-1 transition ${active ? "text-white" : "bg-white text-slate-600"}`}
                    style={{
                      borderColor: line.color,
                      backgroundColor: active ? line.color : "white",
                    }}
                  >
                    {line.name}
                  </button>
                );
              })}
            </div>
            <div style={{ width: "100%", height }}>
              <ResponsiveContainer>
                <LineChart data={filteredData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis domain={yDomain} />
                  <Tooltip
                    formatter={(value: any, name: any) => [
                      `${Number(value || 0).toFixed(1)}`,
                      `${String(name)}（第一筆=100）`,
                    ]}
                  />
                  <ReferenceLine
                    y={100}
                    stroke="#94a3b8"
                    strokeDasharray="4 4"
                  />
                  {visibleLines.map((line) => (
                    <Line
                      key={line.key}
                      type="monotone"
                      dataKey={line.key}
                      name={line.name}
                      stroke={line.color}
                      strokeWidth={2}
                      dot={false}
                      isAnimationActive={false}
                      connectNulls={false}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function normalizeTrendSeries<T extends Record<string, any>>(
  rows: T[],
  key: string,
) {
  const values = rows.map((row) => Number(row[key]));
  const firstValid = values.find(
    (value) => Number.isFinite(value) && value > 0,
  );

  if (!Number.isFinite(firstValid) || !firstValid || firstValid <= 0) {
    return rows.map(() => null);
  }

  return values.map((value) => {
    if (!Number.isFinite(value) || value <= 0) return null;
    return +((value / firstValid) * 100).toFixed(1);
  });
}

function BodyCompositionRow({
  label,
  value,
  min,
  normalMin,
  normalMax,
  max,
  unit = "",
  colorClass = "bg-slate-700",
  idealText,
}: BodyCompRowProps) {
  const valuePercent = clampPercent(value || 0, min, max);
  const normalStart = clampPercent(normalMin, min, max);
  const normalEnd = clampPercent(normalMax, min, max);
  const normalWidth = Math.max(0, normalEnd - normalStart);

  return (
    <div className="grid grid-cols-[120px_1fr] border-b last:border-b-0">
      <div className="bg-slate-100 p-3">
        <div className="text-base font-semibold text-slate-700">{label}</div>
        <div className="text-xs text-slate-500">
          理想值 {idealText || `${normalMin} ~ ${normalMax}${unit}`}
        </div>
        <div className="text-xs text-slate-400 mt-1">
          目前 {value ? `${value}${unit}` : "-"}
        </div>
      </div>
      <div className="relative bg-white p-3 flex items-center">
        <div className="relative h-6 w-full overflow-hidden rounded-sm bg-slate-100 border">
          <div className="absolute inset-y-0 left-0 w-1/3 border-r bg-slate-50" />
          <div className="absolute inset-y-0 left-1/3 w-1/3 border-r bg-slate-50" />
          <div
            className="absolute inset-y-0 bg-[#dce8ec]"
            style={{ left: `${normalStart}%`, width: `${normalWidth}%` }}
          />
          <div
            className={`absolute inset-y-[4px] rounded-r-sm ${colorClass}`}
            style={{ width: `${Math.max(8, valuePercent)}%` }}
          />
        </div>
      </div>
    </div>
  );
}

function BodyCompositionTypeCard({
  type,
  headline,
  weight,
  muscle,
  bodyFatMass,
  weightIdeal,
  muscleIdeal,
  bodyFatIdeal,
}: {
  type: string;
  headline: string;
  weight: number;
  muscle: number;
  bodyFatMass: number;
  weightIdeal: string;
  muscleIdeal: string;
  bodyFatIdeal: string;
}) {
  const typeTone =
    type === "I型"
      ? {
          ring: "border-emerald-200",
          badge: "bg-emerald-600",
          overlay: "text-emerald-300/55",
        }
      : type === "D型"
        ? {
            ring: "border-amber-200",
            badge: "bg-amber-600",
            overlay: "text-amber-300/55",
          }
        : {
            ring: "border-rose-200",
            badge: "bg-rose-600",
            overlay: "text-amber-300/55",
          };

  return (
    <div
      className={`rounded-2xl border bg-white overflow-hidden ${typeTone.ring}`}
    >
      <div className="flex items-center gap-3 px-4 py-4 border-b bg-slate-50">
        <div
          className={`flex h-11 w-11 items-center justify-center rounded-full text-white text-lg font-bold ${typeTone.badge}`}
        >
          {type.charAt(0)}
        </div>
        <div>
          <div className="text-3xl font-black tracking-tight">{type}</div>
          <div className="text-sm text-slate-600 mt-1">{headline}</div>
        </div>
      </div>

      <div className="p-4 space-y-3">
        <div className="text-xl font-semibold text-slate-700">肌肉脂肪分析</div>
        <div className="overflow-hidden rounded-xl border">
          <div className="grid grid-cols-[120px_1fr] bg-slate-100 text-sm font-semibold text-slate-600">
            <div className="bg-[#97b0b8] text-white p-3">指標</div>
            <div className="grid grid-cols-3 text-center">
              <div className="p-3 border-l">低</div>
              <div className="p-3 border-l bg-[#97b0b8] text-white">正常</div>
              <div className="p-3 border-l">高</div>
            </div>
          </div>

          <div className="relative touch-feedback">
            <TouchFeedbackStyles />
            <div
              className={`pointer-events-none absolute inset-0 flex items-center justify-center text-[180px] font-black leading-none ${typeTone.overlay}`}
            >
              {type.charAt(0)}
            </div>
            <BodyCompositionRow
              label="體重"
              value={weight}
              min={40}
              normalMin={Number(weightIdeal.split("~")[0]) || 54}
              normalMax={Number(weightIdeal.split("~")[1]) || 73}
              max={130}
              unit=" kg"
              colorClass="bg-slate-700"
              idealText={`${weightIdeal} kg`}
            />
            <BodyCompositionRow
              label="骨骼肌重"
              value={muscle}
              min={15}
              normalMin={Number(muscleIdeal.split("~")[0]) || 27}
              normalMax={Number(muscleIdeal.split("~")[1]) || 33}
              max={45}
              unit=" kg"
              colorClass="bg-slate-700"
              idealText={`${muscleIdeal} kg`}
            />
            <BodyCompositionRow
              label="體脂肪重"
              value={bodyFatMass}
              min={3}
              normalMin={Number(bodyFatIdeal.split("~")[0]) || 8}
              normalMax={Number(bodyFatIdeal.split("~")[1]) || 15}
              max={45}
              unit=" kg"
              colorClass="bg-rose-600"
              idealText={`${bodyFatIdeal} kg`}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function MiniBodyTypeCard({
  type,
  headline,
  weight,
  muscle,
  bodyFatMass,
  onClick,
}: {
  type: string;
  headline: string;
  weight: number;
  muscle: number;
  bodyFatMass: number;
  onClick?: () => void;
}) {
  const typeTone =
    type === "I型"
      ? {
          ring: "border-emerald-200 bg-emerald-50/40",
          badge: "bg-emerald-600",
          accent: "text-emerald-700",
        }
      : type === "D型"
        ? {
            ring: "border-amber-200 bg-amber-50/40",
            badge: "bg-amber-600",
            accent: "text-amber-700",
          }
        : type === "C型"
          ? {
              ring: "border-rose-200 bg-rose-50/40",
              badge: "bg-rose-600",
              accent: "text-rose-700",
            }
          : {
              ring: "border-slate-200 bg-slate-50",
              badge: "bg-slate-500",
              accent: "text-slate-700",
            };

  const safeValues = [weight, muscle, bodyFatMass].map((v) =>
    Number.isFinite(v) ? Math.max(0, v) : 0,
  );
  const maxValue = Math.max(...safeValues, 1);
  const bars = [
    { label: "體重", value: weight, color: "bg-slate-700" },
    { label: "肌肉", value: muscle, color: "bg-slate-600" },
    { label: "脂肪", value: bodyFatMass, color: "bg-rose-600" },
  ];

  return (
    <Card
      data-clickable={onClick ? "true" : undefined}
      className={`overflow-hidden border ${typeTone.ring} ${onClick ? "cursor-pointer active:scale-[0.99] transition-transform" : ""}`}
      onClick={onClick}
    >
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-base font-black text-white ${typeTone.badge}`}
            >
              {type && type !== "-" ? type.charAt(0) : "?"}
            </div>
            <div className="min-w-0">
              <div
                className={`text-lg font-black tracking-tight ${typeTone.accent}`}
              >
                {type || "-"}
              </div>
              <div className="text-xs text-slate-600 line-clamp-2">
                {headline}
              </div>
            </div>
          </div>
          <Badge
            variant="secondary"
            className="shrink-0 inline-flex items-center gap-1"
          >
            <Expand className="h-3 w-3" />
            首頁速覽
          </Badge>
        </div>

        <div className="grid grid-cols-3 gap-2 text-center text-xs">
          {bars.map((item) => (
            <div key={item.label} className="rounded-xl border bg-white p-2">
              <div className="text-slate-500">{item.label}</div>
              <div className="mt-1 text-sm font-semibold">
                {item.value ? `${item.value}kg` : "-"}
              </div>
              <div className="mt-2 h-16 rounded-lg bg-slate-100 p-1 flex items-end justify-center">
                <div
                  className={`w-full rounded-md ${item.color}`}
                  style={{
                    height: `${Math.max(14, (Math.max(0, item.value) / maxValue) * 100)}%`,
                  }}
                />
              </div>
            </div>
          ))}
        </div>

        <div className="rounded-xl border bg-white px-3 py-2 text-xs text-slate-600">
          點一下可放大檢視完整 I / C / D 體態圖
        </div>
      </CardContent>
    </Card>
  );
}

function TouchFeedbackStyles() {
  return (
    <style jsx global>{`
      .touch-feedback button:not(:disabled),
      .touch-feedback [role="button"]:not([aria-disabled="true"]),
      .touch-feedback [data-clickable="true"] {
        transition:
          transform 0.14s ease,
          opacity 0.14s ease,
          box-shadow 0.14s ease,
          filter 0.14s ease,
          background-color 0.14s ease;
        -webkit-tap-highlight-color: transparent;
        touch-action: manipulation;
      }

      .touch-feedback button:not(:disabled):active,
      .touch-feedback [role="button"]:not([aria-disabled="true"]):active,
      .touch-feedback [data-clickable="true"]:active {
        transform: scale(0.97);
        opacity: 0.88;
        filter: brightness(0.98);
      }
    `}</style>
  );
}

function InlineAuthGate({ children }: { children: React.ReactNode }) {
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<"email" | "otp">("email");
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);
  const [currentEmail, setCurrentEmail] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;

    const init = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!active) return;
      setLoggedIn(Boolean(session?.user));
      setCurrentEmail(session?.user?.email || "");
      setEmail(session?.user?.email || "");
      setReady(true);
    };

    init();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return;
      setLoggedIn(Boolean(session?.user));
      setCurrentEmail(session?.user?.email || "");
      if (session?.user?.email) setEmail(session.user.email);
      setReady(true);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  const sendOtp = async () => {
    const trimmedEmail = email.trim().toLowerCase();

    if (!trimmedEmail) {
      setMessage("請先輸入 Email");
      return;
    }

    setLoading(true);
    setMessage("");

    const { error } = await supabase.auth.signInWithOtp({
      email: trimmedEmail,
      options: {
        shouldCreateUser: true,
      },
    });

    setLoading(false);

    if (error) {
      const lower = (error.message || "").toLowerCase();

      if (lower.includes("email rate limit exceeded")) {
        setMessage("驗證碼寄送過於頻繁，請稍後再試。");
        return;
      }

      if (lower.includes("rate limit")) {
        setMessage("操作過於頻繁，請稍後再試。");
        return;
      }

      setMessage(`驗證碼寄送失敗：${error.message}`);
      return;
    }

    setStep("otp");
    setMessage("驗證碼已寄出，請到信箱查看 6 碼驗證碼。");
  };

  const verifyOtp = async () => {
    const trimmedEmail = email.trim().toLowerCase();
    const trimmedOtp = otp.trim();

    if (!trimmedEmail) {
      setMessage("請先輸入 Email");
      return;
    }

    if (!trimmedOtp) {
      setMessage("請輸入 6 碼驗證碼");
      return;
    }

    setLoading(true);
    setMessage("");

    const { error } = await supabase.auth.verifyOtp({
      email: trimmedEmail,
      token: trimmedOtp,
      type: "email",
    });

    setLoading(false);

    if (error) {
      setMessage(`登入失敗：${error.message}`);
      return;
    }

    setMessage("登入成功，正在載入資料...");
  };

  const signOut = async () => {
    setLoading(true);
    await supabase.auth.signOut();
    setLoading(false);
    setStep("email");
    setOtp("");
    setMessage("已登出");
  };

  if (!ready) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="rounded-2xl border bg-white px-6 py-5 text-sm text-slate-600 shadow-sm">
          載入登入狀態中...
        </div>
      </div>
    );
  }

  if (loggedIn) {
    return (
      <div className="relative">
        <div className="sticky top-0 z-50 bg-slate-50/90 backdrop-blur">
          <div className="mx-auto flex w-full max-w-md items-center justify-between gap-3 px-3 pt-3">
            <div className="min-w-0 rounded-xl border bg-white px-3 py-2 text-xs text-slate-600 shadow-sm">
              已登入：
              <span className="font-medium text-slate-800">
                {currentEmail || "-"}
              </span>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={signOut}
              disabled={loading}
            >
              登出
            </Button>
          </div>
        </div>
        {children}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 touch-feedback">
      <TouchFeedbackStyles />
      <div className="w-full max-w-md rounded-3xl border bg-white p-5 shadow-sm space-y-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            猛健樂個人版 Pro
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            請先登入，資料才會同步到雲端。
          </p>
        </div>

        <div className="space-y-3">
          <Input
            type="email"
            placeholder="請輸入 Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
          />

          {step === "otp" ? (
            <Input
              inputMode="numeric"
              placeholder="請輸入 6 碼驗證碼"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              disabled={loading}
            />
          ) : null}
        </div>

        <div className="space-y-2">
          {step === "email" ? (
            <Button
              type="button"
              className="w-full"
              onClick={sendOtp}
              disabled={loading}
            >
              {loading ? "寄送中..." : "寄送驗證碼"}
            </Button>
          ) : (
            <>
              <Button
                type="button"
                className="w-full"
                onClick={verifyOtp}
                disabled={loading}
              >
                {loading ? "驗證中..." : "驗證碼登入"}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => {
                  setStep("email");
                  setOtp("");
                  setMessage("");
                }}
                disabled={loading}
              >
                返回重寄
              </Button>
            </>
          )}
        </div>

        {message ? (
          <div
            className={`text-sm ${message.includes("失敗") ? "text-red-600" : "text-emerald-600"}`}
          >
            {message}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default function SimpleTracker() {
  const [mounted, setMounted] = useState(false);
  const [today, setToday] = useState("");
  const [themeMode, setThemeMode] = useState<"light" | "dark">("light");
  const [notificationPermission, setNotificationPermission] = useState<
    NotificationPermission | "default" | "unsupported"
  >("default");

  const defaultSettings: Settings = {
    firstShotDate: "",
    notificationsOn: true,
    elcdMode: false,
    bmrMethod: "mifflin",
    height: "",
    age: "",
    goal: "",
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
    bodyFatPct: "",
    fatMass: "",
    muscleRate: "",
    muscleMass: "",
    visceralFat: "",
    bodyWater: "",
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
    totalGrids: "240",
    penStartDate: "",
    manualAdjustGrids: "0",
  });
  const [photoRecords, setPhotoRecords] = useState<PhotoRecord[]>([]);
  const [photoDate, setPhotoDate] = useState("");
  const [photoNote, setPhotoNote] = useState("");
  const [photoCompareA, setPhotoCompareA] = useState("");
  const [photoCompareB, setPhotoCompareB] = useState("");
  const [cloudReady, setCloudReady] = useState(false);
  const [cloudUserId, setCloudUserId] = useState("");
  const [expandedChart, setExpandedChart] = useState<null | {
    type: "metric" | "composite";
    key?: string;
    title: string;
    unit?: string;
    goalValue?: number | null;
  }>(null);
  const [activeCompositeMetrics, setActiveCompositeMetrics] = useState<
    string[]
  >([
    "weightTrend",
    "bodyFatPctTrend",
    "fatMassTrend",
    "muscleRateTrend",
    "muscleMassTrend",
    "visceralFatTrend",
    "bodyWaterTrend",
  ]);

  const [selectedSummaryYear, setSelectedSummaryYear] = useState("");
  const [selectedSummaryMonth, setSelectedSummaryMonth] = useState("");
  const [workoutEquipments, setWorkoutEquipments] = useState<WorkoutEquipment[]>([
    "bike",
    "kettlebell",
  ]);
  const [workoutLevel, setWorkoutLevel] = useState<WorkoutLevel>("low");
  const [workoutStyle, setWorkoutStyle] = useState<WorkoutStyle>("easy");
  const [openWorkoutTeachId, setOpenWorkoutTeachId] = useState<string | null>(null);

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

    if (typeof window !== "undefined") {
      const savedTheme = window.localStorage.getItem("mounjaro-theme-mode");
      if (savedTheme === "dark" || savedTheme === "light") {
        setThemeMode(savedTheme);
      } else if (
        window.matchMedia &&
        window.matchMedia("(prefers-color-scheme: dark)").matches
      ) {
        setThemeMode("dark");
      }
    }

    if (typeof window !== "undefined" && "Notification" in window) {
      setNotificationPermission(Notification.permission);
    } else {
      setNotificationPermission("unsupported");
    }
  }, []);

  useEffect(() => {
    if (!today) return;

    if (!selectedSummaryYear || !selectedSummaryMonth) {
      const [year, month] = today.split("-");
      setSelectedSummaryYear((prev) => prev || year || "");
      setSelectedSummaryMonth((prev) => prev || month || "");
    }

    const loadData = async () => {
      const data = localStorage.getItem(STORAGE_KEY);
      const settingsData = localStorage.getItem(SETTINGS_KEY);
      const penInventoryData = localStorage.getItem(PEN_INVENTORY_KEY);
      const photoRecordsData = localStorage.getItem(PHOTO_RECORDS_KEY);

      let localEntries: Entry[] = [];
      let localSettings: Settings = {
        ...defaultSettings,
        firstShotDate: today,
      };
      let localPenInventory: PenInventory = {
        penStrength: "10",
        totalGrids: "240",
        penStartDate: today,
        manualAdjustGrids: "0",
      };
      let localPhotos: PhotoRecord[] = [];

      if (data) {
        try {
          const parsed = JSON.parse(data);
          localEntries = Array.isArray(parsed)
            ? parsed.map((item, index) => {
                const legacySideEffect = (item?.sideEffect ||
                  "無") as SideEffect;
                const legacySeverity =
                  item?.sideEffectSeverity ||
                  (item?.sideEffect && item?.sideEffect !== "無" ? "2" : "0");

                const normalizedSideEffects: SideEffectItem[] =
                  Array.isArray(item?.sideEffects) && item.sideEffects.length
                    ? item.sideEffects.map((se: any) => ({
                        effect: (se?.effect || "無") as SideEffect,
                        severity: String(se?.severity || "0"),
                      }))
                    : [
                        {
                          effect: legacySideEffect,
                          severity: String(legacySeverity),
                        },
                      ];

                const firstActive =
                  normalizedSideEffects.find((se) => se.effect !== "無") ||
                  normalizedSideEffects[0];

                return {
                  id:
                    item?.id ||
                    `legacy-${item?.date || "item"}-${index}-${Math.random()
                      .toString(36)
                      .slice(2, 8)}`,
                  date: item?.date || today,
                  weight: item?.weight || "",
                  bodyFatPct: String(item?.bodyFatPct || item?.bodyFat || ""),
                  fatMass: String(
                    item?.fatMass || item?.bodyFatMass || item?.fatKg || "",
                  ),
                  muscleRate: String(
                    item?.muscleRate ||
                      getMuscleRateValue(
                        num(item?.weight || 0),
                        num(item?.muscleMass || 0),
                      ) ||
                      "",
                  ),
                  muscleMass: String(item?.muscleMass || ""),
                  visceralFat: String(item?.visceralFat || ""),
                  bodyWater: String(item?.bodyWater || item?.water || ""),
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
        } catch {
          localEntries = [];
        }
      }

      const freshDefaults: Settings = {
        ...defaultSettings,
        firstShotDate: today,
      };

      if (settingsData) {
        try {
          localSettings = { ...freshDefaults, ...JSON.parse(settingsData) };
        } catch {
          localSettings = freshDefaults;
        }
      } else {
        localSettings = freshDefaults;
      }

      if (penInventoryData) {
        try {
          const parsed = JSON.parse(penInventoryData);
          localPenInventory = {
            penStrength: String(parsed?.penStrength || "10"),
            totalGrids: String(
              parsed?.totalGrids ||
                (parsed?.totalPens
                  ? Math.max(0, num(parsed.totalPens)) * 60
                  : 240),
            ),
            penStartDate: String(parsed?.penStartDate || today),
            manualAdjustGrids: String(parsed?.manualAdjustGrids || "0"),
          };
        } catch {
          localPenInventory = {
            penStrength: "10",
            totalGrids: "240",
            penStartDate: today,
            manualAdjustGrids: "0",
          };
        }
      }

      if (photoRecordsData) {
        try {
          const parsed = JSON.parse(photoRecordsData);
          localPhotos = Array.isArray(parsed) ? parsed : [];
        } catch {
          localPhotos = [];
        }
      }

      let finalEntries = localEntries;
      let finalSettings = localSettings;
      let finalPenInventory = localPenInventory;
      let finalPhotos = localPhotos;

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        setCloudUserId(user.id);

        const { data: cloudRow, error } = await supabase
          .from("tracker_data")
          .select("payload")
          .eq("user_id", user.id)
          .maybeSingle();

        if (!error && cloudRow?.payload) {
          const payload = cloudRow.payload as Partial<CloudPayload>;

          finalEntries = Array.isArray(payload.entries)
            ? payload.entries.map((item, index) => {
                const fallbackSideEffects =
                  Array.isArray(item?.sideEffects) && item.sideEffects.length
                    ? item.sideEffects.map((se) => ({
                        effect: (se?.effect || "無") as SideEffect,
                        severity: String(se?.severity || "0"),
                      }))
                    : [
                        {
                          effect: (item?.sideEffect || "無") as SideEffect,
                          severity: String(item?.sideEffectSeverity || "0"),
                        },
                      ];

                const firstActive =
                  fallbackSideEffects.find((se) => se.effect !== "無") ||
                  fallbackSideEffects[0];

                return {
                  id:
                    item?.id ||
                    `cloud-${item?.date || "item"}-${index}-${Math.random()
                      .toString(36)
                      .slice(2, 8)}`,
                  date: item?.date || today,
                  weight: String(item?.weight || ""),
                  bodyFatPct: String(item?.bodyFatPct || ""),
                  fatMass: String(item?.fatMass || ""),
                  muscleRate: String(
                    item?.muscleRate ||
                      getMuscleRateValue(
                        num(item?.weight || 0),
                        num(item?.muscleMass || 0),
                      ) ||
                      "",
                  ),
                  muscleMass: String(item?.muscleMass || ""),
                  visceralFat: String(item?.visceralFat || ""),
                  bodyWater: String(item?.bodyWater || ""),
                  dose: String(item?.dose || "2.5"),
                  appetite: (item?.appetite || "正常") as Appetite,
                  cravingLevel: (item?.cravingLevel || "中") as CravingLevel,
                  sideEffect: (firstActive?.effect || "無") as SideEffect,
                  sideEffectSeverity: String(firstActive?.severity || "0"),
                  sideEffects: fallbackSideEffects,
                  exerciseMin: String(item?.exerciseMin || "0"),
                  isShotDay: Boolean(item?.isShotDay),
                };
              })
            : localEntries;

          finalSettings = {
            ...freshDefaults,
            ...(payload.settings || {}),
          };

          finalPenInventory = {
            penStrength: String(
              payload.penInventory?.penStrength ||
                localPenInventory.penStrength ||
                "10",
            ),
            totalGrids: String(
              payload.penInventory?.totalGrids ||
                localPenInventory.totalGrids ||
                "240",
            ),
            penStartDate: String(
              payload.penInventory?.penStartDate ||
                localPenInventory.penStartDate ||
                today,
            ),
            manualAdjustGrids: String(
              payload.penInventory?.manualAdjustGrids ||
                localPenInventory.manualAdjustGrids ||
                "0",
            ),
          };

          finalPhotos = Array.isArray(payload.photoRecords)
            ? payload.photoRecords.map((item, index) => ({
                id:
                  item?.id ||
                  `photo-${item?.date || "item"}-${index}-${Math.random()
                    .toString(36)
                    .slice(2, 8)}`,
                date: String(item?.date || today),
                note: String(item?.note || ""),
                imageData: String(item?.imageData || ""),
              }))
            : localPhotos;
        } else if (error) {
          console.error("Cloud load failed:", error);
        }
      }

      setEntries(finalEntries);
      if (finalEntries.length) {
        const latestEntryDate = finalEntries
          .map((entry) => entry.date)
          .sort()
          .slice(-1)[0];
        if (latestEntryDate) {
          const [year, month] = latestEntryDate.split("-");
          setSelectedSummaryYear((prev) => prev || year || "");
          setSelectedSummaryMonth((prev) => prev || month || "");
        }
      }
      setSettings(finalSettings);
      setTempSettings(finalSettings);
      setPenInventory(finalPenInventory);
      setPhotoRecords(finalPhotos);

      setForm((prev) => ({
        ...prev,
        date: today,
        bodyFatPct: prev.bodyFatPct || "",
        fatMass: prev.fatMass || "",
        muscleRate: prev.muscleRate || "",
        muscleMass: prev.muscleMass || "",
        visceralFat: prev.visceralFat || "",
        bodyWater: prev.bodyWater || "",
      }));
      setPhotoDate(today);
      setCloudReady(true);
    };

    loadData();
  }, [today]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  }, []);

  useEffect(() => {
    if (!mounted) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    localStorage.setItem(PEN_INVENTORY_KEY, JSON.stringify(penInventory));
    localStorage.setItem(PHOTO_RECORDS_KEY, JSON.stringify(photoRecords));
  }, [entries, settings, penInventory, photoRecords, mounted]);

  useEffect(() => {
    if (!mounted || !cloudReady || !cloudUserId) return;

    const timer = window.setTimeout(async () => {
      const payload: CloudPayload = {
        entries,
        settings,
        penInventory,
        photoRecords,
      };

      const { error } = await supabase.from("tracker_data").upsert(
        {
          user_id: cloudUserId,
          payload,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" },
      );

      if (error) {
        console.error("Supabase sync failed:", error);
      }
    }, 800);

    return () => window.clearTimeout(timer);
  }, [
    entries,
    settings,
    penInventory,
    photoRecords,
    mounted,
    cloudReady,
    cloudUserId,
  ]);

  const sortedEntries = useMemo(() => {
    return [...entries].sort(
      (a, b) =>
        parseLocalDate(a.date).getTime() - parseLocalDate(b.date).getTime(),
    );
  }, [entries]);

  const latest = sortedEntries.length
    ? sortedEntries[sortedEntries.length - 1]
    : null;

  const latestWeight = latest ? num(latest.weight) : 0;
  const latestBodyFatPct = latest ? num(latest.bodyFatPct) : 0;
  const latestFatMass = latest ? num(latest.fatMass) : 0;
  const latestMuscleRate = latest ? getMuscleRateFromEntry(latest) : 0;
  const latestMuscleMass = latest ? num(latest.muscleMass) : 0;
  const latestVisceralFat = latest ? num(latest.visceralFat) : 0;
  const latestBodyWater = latest ? num(latest.bodyWater) : 0;
  const bmi = getBMI(num(settings.height), latestWeight);
  const bmiLabel = getBMILabel(bmi);
  const bmrMifflin = getBMR(
    latestWeight,
    num(settings.height),
    num(settings.age),
    settings.sex,
  );
  const bmrKatch = getBMRByLeanMass(
    latestWeight,
    latestBodyFatPct,
    latestFatMass,
  );
  const bmr =
    settings.bmrMethod === "katch" ? bmrKatch || bmrMifflin : bmrMifflin;
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
    return +(
      num(recent[0].weight) - num(recent[recent.length - 1].weight)
    ).toFixed(1);
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
      return {
        text: "-",
        date: "-",
        shouldNotify: false,
        baseDate: "-",
        source: "未設定",
      };
    }

    const interval = Math.max(1, num(settings.shotInterval || 7));
    const nextDate = getNextShotDate(baseDate, interval, today);
    const diff = nextDate ? daysBetween(today, nextDate) : 0;

    return {
      date: nextDate || "-",
      text:
        diff > 0
          ? `${diff} 天後`
          : diff === 0
            ? "今天"
            : `已過 ${Math.abs(diff)} 天`,
      shouldNotify: settings.notificationsOn && diff <= 1,
      baseDate,
      source: recordBaseDate ? "最近一次施打日紀錄" : "首次施打日期",
    };
  }, [
    latestShotDate,
    settings.firstShotDate,
    today,
    settings.shotInterval,
    settings.notificationsOn,
  ]);

  const previewNextShot = useMemo(() => {
    const recordBaseDate = latestShotDate;
    const fallbackBaseDate = tempSettings.firstShotDate;
    const baseDate = recordBaseDate || fallbackBaseDate;
    if (!baseDate || !today) {
      return {
        date: "-",
        text: "請先設定首次施打日期",
        baseDate: "-",
        source: "未設定",
      };
    }

    const interval = Math.max(1, num(tempSettings.shotInterval || 7));
    const nextDate = getNextShotDate(baseDate, interval, today);
    const diff = nextDate ? daysBetween(today, nextDate) : 0;

    return {
      date: nextDate || "-",
      text:
        diff > 0
          ? `${diff} 天後`
          : diff === 0
            ? "今天"
            : `已過 ${Math.abs(diff)} 天`,
      baseDate,
      source: recordBaseDate ? "最近一次施打日紀錄" : "首次施打日期",
    };
  }, [
    latestShotDate,
    tempSettings.firstShotDate,
    tempSettings.shotInterval,
    today,
  ]);

  const shotCycleDay = useMemo(() => {
    return latestShotDate && today ? getShotCycleDay(latestShotDate, today) : 0;
  }, [latestShotDate, today]);

  const shotStatus = useMemo(() => {
    if (!today) {
      return { status: "尚未建立", text: "請先建立施打日", overdueDays: 0 };
    }

    const interval = Math.max(1, num(settings.shotInterval || 7));
    const recentShotEntries = sortedEntries.filter(
      (entry) => entry.isShotDay && daysBetween(entry.date, today) >= 0,
    );
    const latestRecordedShot = recentShotEntries.length
      ? recentShotEntries[recentShotEntries.length - 1]
      : null;

    if (latestRecordedShot) {
      const sinceLatestShot = daysBetween(latestRecordedShot.date, today);
      if (sinceLatestShot === 0) {
        return {
          status: "今天已施打",
          text: `已記錄今日施打，下次約在 ${nextShot.date}`,
          overdueDays: 0,
        };
      }
      if (sinceLatestShot < interval) {
        return {
          status: "本週已施打",
          text: `距離下次施打還有 ${Math.max(0, interval - sinceLatestShot)} 天`,
          overdueDays: 0,
        };
      }
    }

    if (!nextShot.date || nextShot.date === "-") {
      return { status: "尚未建立", text: "請先建立施打日", overdueDays: 0 };
    }

    const diff = daysBetween(today, nextShot.date);
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
  }, [nextShot.date, settings.shotInterval, sortedEntries, today]);

  const progress = useMemo(() => {
    const goal = num(settings.goal);
    const start = sortedEntries.length ? num(sortedEntries[0].weight) : 0;

    if (!goal || !start || !latestWeight) return 0;

    if (latestWeight <= goal) return 100;
    if (start <= goal) return 0;

    const totalNeed = start - goal;
    const done = start - latestWeight;

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
    const delta = Math.abs(
      num(recent[0].weight) - num(recent[recent.length - 1].weight),
    );
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

  const previousEntry = useMemo(() => {
    return sortedEntries.length >= 2
      ? sortedEntries[sortedEntries.length - 2]
      : null;
  }, [sortedEntries]);

  const bodyCompositionAI = useMemo(() => {
    const weightLow = +(
      18.5 *
      (num(settings.height) / 100) *
      (num(settings.height) / 100)
    ).toFixed(1);
    const weightHigh = +(
      24 *
      (num(settings.height) / 100) *
      (num(settings.height) / 100)
    ).toFixed(1);
    const muscleLow = settings.sex === "female" ? 21 : 27;
    const muscleHigh = settings.sex === "female" ? 27 : 33;
    const bodyFatPct = latestBodyFatPct || bodyFat;
    const bodyFatMass =
      latestFatMass ||
      (latestWeight && bodyFatPct
        ? +((latestWeight * bodyFatPct) / 100).toFixed(1)
        : 0);
    const bodyFatMassLow =
      settings.sex === "female"
        ? +(weightLow * 0.18).toFixed(1)
        : +(weightLow * 0.14).toFixed(1);
    const bodyFatMassHigh =
      settings.sex === "female"
        ? +(weightHigh * 0.3).toFixed(1)
        : +(weightHigh * 0.22).toFixed(1);

    if (!latest) {
      return {
        type: "-",
        summary: "先累積身體組成資料後再分析",
        headline: "尚無足夠資料判讀體態",
        meaning:
          "先記錄體脂率、肌肉量、水分與內臟脂肪，之後才會生成 I / C / D 體態圖。",
        caution: ["至少先記錄 2~3 筆體脂、肌肉量、水分與內臟脂肪"],
        menuAdjustments: ["先維持現有熱量與蛋白質規劃"],
        bodyFatMass: 0,
        weightIdeal: `${weightLow}~${weightHigh}`,
        muscleIdeal: `${muscleLow}~${muscleHigh}`,
        bodyFatIdeal: `${bodyFatMassLow}~${bodyFatMassHigh}`,
      };
    }

    const muscleMass = latestMuscleMass;
    const visceralFat = latestVisceralFat;
    const bodyWater = latestBodyWater;
    const prevBodyFat = previousEntry ? num(previousEntry.bodyFatPct) : 0;
    const prevFatMass = previousEntry ? num(previousEntry.fatMass) : 0;
    const prevMuscle = previousEntry ? num(previousEntry.muscleMass) : 0;
    const prevWater = previousEntry ? num(previousEntry.bodyWater) : 0;

    let type = "C型";
    let headline = "體脂肪重高於骨骼肌重";
    let summary =
      "目前偏向體脂較高、肌肉量相對不足的體態，重點是減脂同時保住肌肉。";
    let meaning =
      "這類體態通常代表體脂偏高、骨骼肌支撐不夠，不能只追求體重下降，還要顧蛋白質與阻力訓練。";
    const caution: string[] = [];
    const menuAdjustments: string[] = [];

    const isLean =
      bodyFatPct > 0 &&
      bodyFatPct <= (settings.sex === "female" ? 30 : 22) &&
      visceralFat > 0 &&
      visceralFat <= 9 &&
      muscleMass >= muscleLow;

    const isDenseHighFat =
      (visceralFat >= 12 &&
        bodyFatPct >= (settings.sex === "female" ? 34 : 27)) ||
      (muscleMass >= muscleHigh &&
        bodyFatPct >= (settings.sex === "female" ? 32 : 24));

    if (isLean) {
      type = "I型";
      headline = "骨骼肌保留較佳，體脂控制相對理想";
      summary = "脂肪控制與肌肉保留相對較好，體態正往精瘦型前進。";
      meaning =
        "這代表你目前的減脂方向比較漂亮，體脂沒有明顯壓過肌肉量，現在更該注意不要減太快。";
      caution.push("避免熱量切太低，免得肌肉量反而掉太快");
      caution.push("持續固定阻力訓練或至少維持步行與蛋白質");
      menuAdjustments.push("主食維持目前份量，不要再大砍");
      menuAdjustments.push("每餐優先蛋白質 1 掌心以上");
    } else if (isDenseHighFat) {
      type = "D型";
      headline = "肌肉量不差，但脂肪與內臟脂肪負擔偏高";
      summary =
        "目前偏向脂肪與內臟脂肪負擔較高型，先以穩定減脂與改善代謝為主。";
      meaning =
        "這類體態常見於有一定肌肉基礎，但腹部脂肪與整體脂肪偏高；重點不是增肌，而是先把脂肪壓下來。";
      caution.push("先把精緻澱粉、含糖飲料、宵夜壓低");
      caution.push("內臟脂肪較高時，比起極端節食，更重要的是穩定執行");
      menuAdjustments.push("晚餐主食再少 1/4 份，蔬菜與蛋白質提高");
      menuAdjustments.push("每週至少 3 天安排 20~30 分鐘活動");
    } else {
      caution.push("現在最重要的是讓體脂慢慢降、肌肉量不要明顯掉");
      caution.push("別只看體重，體脂與腰腹脂肪趨勢更重要");
      menuAdjustments.push("早餐與加餐補足蛋白質，放鬆餐頻率先收斂");
      menuAdjustments.push("維持中等熱量赤字，不要忽高忽低");
    }

    if (
      (prevBodyFat && bodyFatPct && bodyFatPct > prevBodyFat + 0.3) ||
      (prevFatMass && bodyFatMass && bodyFatMass > prevFatMass + 0.3)
    ) {
      caution.push("最近體脂率或脂肪重有回升，先檢查放鬆餐與隱藏熱量");
    } else if (
      (prevBodyFat && bodyFatPct && bodyFatPct < prevBodyFat - 0.3) ||
      (prevFatMass && bodyFatMass && bodyFatMass < prevFatMass - 0.3)
    ) {
      menuAdjustments.push("最近體脂或脂肪重有往下，維持目前乾淨飲食節奏");
    }

    if (prevMuscle && muscleMass && muscleMass < prevMuscle - 0.3) {
      caution.push("肌肉量有下降跡象，蛋白質與阻力訓練要補上");
      menuAdjustments.push("每天蛋白質分散到 3 餐以上，不要全擠在一餐");
    }

    if (prevWater && bodyWater && bodyWater < prevWater - 0.5) {
      caution.push("水分下降較明顯，最近的體重下降可能混有水分波動");
    } else if (bodyWater && bodyWater < 45) {
      caution.push("水分偏低，先把補水與電解質穩住");
    }

    return {
      type,
      headline,
      summary,
      meaning,
      caution,
      menuAdjustments,
      bodyFatMass,
      weightIdeal: `${weightLow}~${weightHigh}`,
      muscleIdeal: `${muscleLow}~${muscleHigh}`,
      bodyFatIdeal: `${bodyFatMassLow}~${bodyFatMassHigh}`,
    };
  }, [
    latest,
    bodyFat,
    latestBodyFatPct,
    latestMuscleMass,
    latestVisceralFat,
    latestBodyWater,
    latestWeight,
    previousEntry,
    settings.sex,
    settings.height,
  ]);

  const waterVsFat = useMemo(() => {
    const longWindow = sortedEntries.filter((entry) => {
      const diff = daysBetween(entry.date, latest?.date || entry.date);
      return diff >= 0 && diff <= 28;
    });
    const shortWindow = sortedEntries.slice(-4);

    const isCompleteCompEntry = (entry: Entry) =>
      num(entry.weight) > 0 &&
      num(entry.bodyFatPct) > 0 &&
      num(entry.fatMass) > 0 &&
      num(entry.muscleMass) > 0 &&
      num(entry.bodyWater) > 0;

    const validLongWindow = longWindow.filter(isCompleteCompEntry);
    const validShortWindow = shortWindow.filter(isCompleteCompEntry);

    if (validLongWindow.length < 2) {
      return {
        tag: "觀察中",
        title: "有效資料不足",
        detail:
          "長期判斷已改成只用區間內第一筆完整有效紀錄當基準；目前完整有效資料不足，先持續記錄。",
        confidence: "低" as const,
        reasons: [
          validLongWindow.length
            ? "長期完整有效紀錄還不足 2 筆"
            : "近 28 天沒有足夠完整的身體組成紀錄",
        ],
      };
    }

    const longBase = validLongWindow[0];
    const longLast = validLongWindow[validLongWindow.length - 1];
    const shortBase = validShortWindow.length >= 2 ? validShortWindow[0] : validLongWindow[Math.max(0, validLongWindow.length - 2)];
    const shortLast = validShortWindow.length >= 2 ? validShortWindow[validShortWindow.length - 1] : longLast;

    const weightDelta = +(num(longLast.weight) - num(longBase.weight)).toFixed(1);
    const fatPctDelta = +(num(longLast.bodyFatPct) - num(longBase.bodyFatPct)).toFixed(1);
    const fatMassDelta = +(num(longLast.fatMass) - num(longBase.fatMass)).toFixed(1);
    const muscleDelta = +(num(longLast.muscleMass) - num(longBase.muscleMass)).toFixed(1);
    const waterDelta = +(num(longLast.bodyWater) - num(longBase.bodyWater)).toFixed(1);
    const visceralDelta = +(num(longLast.visceralFat) - num(longBase.visceralFat)).toFixed(1);
    const days = Math.max(1, daysBetween(longBase.date, longLast.date));

    const shortWaterDelta = +(num(shortLast.bodyWater) - num(shortBase.bodyWater)).toFixed(1);
    const shortFatPctDelta = +(num(shortLast.bodyFatPct) - num(shortBase.bodyFatPct)).toFixed(1);
    const shortDays = Math.max(1, daysBetween(shortBase.date, shortLast.date));

    const reasons: string[] = [
      `長期基準改用 ${longBase.date} 這筆完整有效紀錄`,
    ];
    let confidenceScore = 1;
    let tag = "觀察中";
    let title = "趨勢尚不明確";
    let detail = "目前像是混合波動，先持續觀察 1~2 週，不要只看單日數字。";

    const weightDown = weightDelta <= -0.4;
    const fatDown = fatMassDelta <= -0.3;
    const fatPctDown = fatPctDelta <= -0.3;
    const waterDown = waterDelta <= -0.8;
    const muscleDown = muscleDelta <= -0.5;
    const fatUp = fatMassDelta >= 0.3 || fatPctDelta >= 0.3;
    const shortWaterDrop = shortWaterDelta <= -0.8;

    if (weightDown && fatDown && fatPctDown && !muscleDown) {
      tag = "脂肪主導";
      title = "目前下降以脂肪為主";
      detail =
        "長期判斷是拿區間內第一筆完整有效紀錄與最新完整紀錄相比，體重、體脂率、脂肪重都有往下，且肌肉量沒有明顯掉。";
      reasons.push("長期體脂率下降");
      reasons.push("長期脂肪重下降");
      reasons.push("長期肌肉量保留尚可");
      confidenceScore += 3;
    } else if (weightDown && shortWaterDrop && !fatDown && Math.abs(fatPctDelta) < 0.3) {
      tag = "水分主導";
      title = "最近較像水分波動";
      detail =
        "短期水分有下降，但用長期第一筆完整有效紀錄回看，脂肪重與體脂率沒有同步明顯往下，先別把這波全當成減脂。";
      reasons.push(`短期 ${shortDays} 天水分下降較明顯`);
      reasons.push("長期脂肪指標變化有限");
      confidenceScore += 3;
    } else if (weightDown && muscleDown && (!fatDown || fatPctDelta >= 0)) {
      tag = "肌肉警訊";
      title = "這波下降可能混有肌肉流失";
      detail =
        "用長期完整有效基準回看，體重下降同時肌肉量也掉，而且脂肪指標改善不夠明顯，接下來要優先補蛋白質並加上阻力訓練。";
      reasons.push("長期肌肉量下降");
      reasons.push("長期脂肪改善不明顯");
      confidenceScore += 3;
    } else if (weightDown && fatDown && waterDown) {
      tag = "混合下降";
      title = "目前像脂肪＋水分混合下降";
      detail =
        "長期回看有脂肪重與水分一起下降，方向不差，但不要把所有下降都當成純脂肪。";
      reasons.push("長期脂肪重下降");
      reasons.push("長期水分也同步下降");
      confidenceScore += 2;
    } else if (weightDelta >= 0.3 && fatUp) {
      tag = "脂肪回升";
      title = "近期有脂肪回升跡象";
      detail =
        "用區間內第一筆完整有效紀錄當基準回看，體脂率或脂肪重有上升，先檢查放鬆餐、外食份量、宵夜與飲料。";
      reasons.push("長期體脂率或脂肪重上升");
      confidenceScore += 2;
    }

    if (visceralDelta <= -1) {
      reasons.push("內臟脂肪有下降");
      confidenceScore += 1;
    } else if (visceralDelta >= 1) {
      reasons.push("內臟脂肪有回升");
    }

    if (days >= 14) confidenceScore += 1;
    if (validLongWindow.length >= 3) confidenceScore += 1;

    const confidence =
      confidenceScore >= 5
        ? ("高" as const)
        : confidenceScore >= 3
          ? ("中" as const)
          : ("低" as const);

    if (Math.abs(shortFatPctDelta) >= 0.3) {
      reasons.push(`短期 ${shortDays} 天體脂率 ${shortFatPctDelta > 0 ? "+" : ""}${shortFatPctDelta}%`);
    }
    if (!reasons.length) {
      reasons.push("近期數值變化不夠一致");
    }

    return {
      tag,
      title,
      detail,
      confidence,
      reasons,
    };
  }, [sortedEntries, latest]);

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
      return {
        enabled: false,
        score: 0,
        reasons: ["資料不足，至少需要 3 筆紀錄"],
      };
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
        settings.bmrMethod === "katch"
          ? "目前使用體脂器公式，會依最新體脂/脂肪重推估瘦體重，飲食會更強調保肌與蛋白質。"
          : settings.sex === "female"
            ? "目前使用一般公式，女性版菜單會把基準熱量抓得更保守，份量通常比男性版略少。"
            : "目前使用一般公式，男性版菜單會依較高熱量需求，保留較足夠的蛋白質與主食份量。",
    };
  }, [bmr, tdee, cutCalories, settings.sex]);

  const bodyCompositionMenuHint = useMemo(() => {
    if (!latest) return "先建立身體組成紀錄，再做菜單微調。";
    if (bodyCompositionAI.type === "I型") {
      return "菜單微調：主食先維持，不要過度壓熱量；重點放在穩定蛋白質與運動維持線條。";
    }
    if (bodyCompositionAI.type === "D型") {
      return "菜單微調：先減少晚餐澱粉與零食密度，優先蔬菜、豆腐、雞胸、魚肉，外食避開含糖飲與炸物。";
    }
    return "菜單微調：早餐與加餐補足蛋白質，放鬆餐頻率先收斂，主食維持中等份量即可。";
  }, [latest, bodyCompositionAI]);

  const cheatDecision = useMemo(() => {
    if (!latest || sortedEntries.length < 3) {
      return {
        level: "-",
        reason: "資料不足",
        plan: [] as string[],
        rule: "先累積紀錄",
      };
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
        rule: "一餐放鬆，不延續到下一餐",
        plan: [
          "優先蛋白質：燒肉/牛排/雞腿",
          "碳水可吃：飯 1 碗或漢堡 1 個",
          "避免：甜點+含糖飲料一起上",
          "吃完就收，不把放鬆餐變成放鬆日",
        ],
      };
    }

    if (score >= 3) {
      return {
        level: "可控放鬆",
        reason: "有嘴饞或減重趨緩",
        rule: "可吃外食，但份量要收斂",
        plan: [
          "炸物可吃但減半",
          "飲料改零卡或無糖",
          "先吃蛋白質再吃其他",
          "總量控制在 TDEE 內較穩",
        ],
      };
    }

    return {
      level: "不建議",
      reason: "目前減脂順利",
      rule: "以計畫內飲食為主，真的要吃就選相對乾淨版",
      plan: ["維持現在飲食", "嘴饞用蛋白質替代", "避免高熱量誘惑"],
    };
  }, [latest, sortedEntries, plateau, weeklyLoss]);

  const cheatRestaurantOptions = useMemo(() => {
    const stricter = cheatDecision.level === "不建議";
    const moderate = cheatDecision.level === "可控放鬆";

    return [
      {
        brand: "麥當勞",
        title: stricter ? "相對乾淨版" : moderate ? "可控放鬆版" : "放鬆餐版",
        combos: stricter
          ? [
              "麥香鷄 / 嫩煎鷄腿堡 擇一 + 無糖茶 / 黑咖啡",
              "若很餓可加 4 塊麥克鷄塊，不再加薯條",
            ]
          : moderate
            ? [
                "主餐漢堡 1 份 + 小薯 1 份 + 零卡可樂",
                "或 6 塊麥克鷄塊 + 漢堡 + 無糖飲，甜點先略過",
              ]
            : [
                "漢堡 1 份 + 小薯 1 份 + 零卡飲",
                "真的很想吃炸物時，以雞塊或小薯擇一，不要雙炸物",
              ],
        note: "重點是保留滿足感，但不要再疊加甜點與含糖飲。",
      },
      {
        brand: "Subway / 潛艇堡類",
        title: "高蛋白外食版",
        combos: [
          "6 吋雞肉類 + 雙倍蔬菜 + 無糖飲",
          "醬料先選清爽型，避免雙醬與餅乾一起上",
        ],
        note: "這類最適合放鬆日又不想讓脂肪重回升。",
      },
      {
        brand: "便利商店",
        title: "最穩定的收斂版",
        combos: [
          "雞胸肉 + 茶葉蛋 + 地瓜 + 無糖豆漿",
          "或 飯糰 1 個 + 沙拉 + 茶葉蛋 + 無糖茶",
        ],
        note: "當天若已經嘴饞高，便利商店反而最好控量。",
      },
      {
        brand: "便當 / 小火鍋",
        title: "台式外食版",
        combos: [
          "便當選雞腿/魚排/滷牛，飯半碗到 1 碗，青菜加量",
          "小火鍋選肉片 + 豆腐 + 蔬菜，主食半份到 1 份",
        ],
        note: "比起完全不吃，吃一份可控的正餐通常更不容易失守。",
      },
    ];
  }, [cheatDecision.level]);

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
      Object.entries(appetiteCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ||
      "正常";
    const cravingTop =
      Object.entries(cravingCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "中";
    const exerciseTop =
      Object.entries(exerciseBuckets).sort((a, b) => b[1] - a[1])[0]?.[0] ||
      "0";

    let effectivePattern = "維持目前節奏";
    if (
      exerciseBuckets["21-40"] + exerciseBuckets["41+"] >=
      Math.ceil(sortedEntries.length / 3)
    ) {
      effectivePattern =
        "你在有規律活動（尤其 20 分鐘以上）時，較容易維持穩定下降";
    } else if (appetiteDownDays >= Math.ceil(sortedEntries.length / 3)) {
      effectivePattern =
        "你在食慾下降的日子更容易守住熱量，這段時間最適合吃乾淨一點";
    } else if (
      lowCravingLossDays >= Math.ceil((sortedEntries.length - 1) / 2)
    ) {
      effectivePattern =
        "你在嘴饞不高時，體重下降通常更順，控制零食對你特別重要";
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
    if (!orderedShotEntries.length)
      return { dose: "-", shotCount: 0, weeks: 0 };
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
      latest &&
      latest.sideEffect !== "無" &&
      num(latest.sideEffectSeverity) >= 3;
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
    const totalGrids = Math.max(0, num(penInventory.totalGrids || 240));
    const penStartDate = penInventory.penStartDate || today;
    const manualAdjustGrids = Math.max(0, num(penInventory.manualAdjustGrids));

    const shotEntriesSinceStart = sortedEntries.filter(
      (entry) =>
        entry.isShotDay &&
        (!penStartDate || daysBetween(penStartDate, entry.date) >= 0),
    );

    const autoUsedGrids = shotEntriesSinceStart.reduce((sum, entry) => {
      const dose = Math.max(0, num(entry.dose));
      if (!strength || !dose || dose > strength) return sum;
      return sum + Math.round((dose / strength) * 60);
    }, 0);

    const usedGrids = autoUsedGrids + manualAdjustGrids;
    const remainGrids = Math.max(0, totalGrids - usedGrids);
    const mgPerGrid = strength ? +(strength / 60).toFixed(4) : 0;
    const remainMg = strength ? +(remainGrids * (strength / 60)).toFixed(2) : 0;

    const calcDosePlan = (dose: number) => {
      if (!strength || !dose || dose > strength) {
        return { dose, gridsNeeded: 0, exactShots: 0, fullShots: 0, months: 0 };
      }

      const gridsNeeded = Math.round((dose / strength) * 60);
      const exactShots = gridsNeeded
        ? +(remainGrids / gridsNeeded).toFixed(1)
        : 0;
      const fullShots = gridsNeeded ? Math.floor(remainGrids / gridsNeeded) : 0;
      const months = fullShots ? +(fullShots / 4).toFixed(1) : 0;

      return { dose, gridsNeeded, exactShots, fullShots, months };
    };

    const supportedDoses = [2.5, 3.5, 5, 7.5, 10, 12.5, 15]
      .filter((dose) => dose <= strength)
      .map(calcDosePlan);

    const latestDosePlan = latest?.dose ? calcDosePlan(num(latest.dose)) : null;
    const targetDosePlan = targetDose ? calcDosePlan(num(targetDose)) : null;

    return {
      strength,
      totalGrids,
      penStartDate,
      shotEntriesSinceStartCount: shotEntriesSinceStart.length,
      autoUsedGrids,
      manualAdjustGrids,
      usedGrids,
      remainGrids,
      mgPerGrid,
      remainMg,
      supportedDoses,
      latestDosePlan,
      targetDosePlan,
    };
  }, [penInventory, latest?.dose, targetDose, sortedEntries, today]);

  const baseChartData = useMemo(
    () =>
      sortedEntries.map((e, i) => {
        const weightValue = num(e.weight);
        const bodyFatPctValue = num(e.bodyFatPct);
        const fatMassValue = num(e.fatMass);
        const muscleRateValue = getMuscleRateFromEntry(e);
        const muscleMassValue = num(e.muscleMass);
        const visceralFatValue = num(e.visceralFat);
        const bodyWaterValue = num(e.bodyWater);

        return {
          i: i + 1,
          date: fmtDate(e.date),
          rawDate: e.date,
          weight: weightValue > 0 ? weightValue : null,
          avg7: weightValue > 0 ? getSevenDayAverage(sortedEntries, i) : null,
          goal: num(settings.goal) || null,
          bodyFatPct: bodyFatPctValue > 0 ? bodyFatPctValue : null,
          fatMass: fatMassValue > 0 ? fatMassValue : null,
          muscleRate: muscleRateValue > 0 ? muscleRateValue : null,
          muscleMass: muscleMassValue > 0 ? muscleMassValue : null,
          visceralFat: visceralFatValue > 0 ? visceralFatValue : null,
          bodyWater: bodyWaterValue > 0 ? bodyWaterValue : null,
        };
      }),
    [sortedEntries, settings.goal],
  );

  const chartData = useMemo(() => {
    const rows = baseChartData.map((row) => ({ ...row }));
    const trendSeries = {
      weightTrend: normalizeTrendSeries(rows, "weight"),
      bodyFatPctTrend: normalizeTrendSeries(rows, "bodyFatPct"),
      fatMassTrend: normalizeTrendSeries(rows, "fatMass"),
      muscleRateTrend: normalizeTrendSeries(rows, "muscleRate"),
      muscleMassTrend: normalizeTrendSeries(rows, "muscleMass"),
      visceralFatTrend: normalizeTrendSeries(rows, "visceralFat"),
      bodyWaterTrend: normalizeTrendSeries(rows, "bodyWater"),
    };

    return rows.map((row, index) => ({
      ...row,
      weightTrend: trendSeries.weightTrend[index],
      bodyFatPctTrend: trendSeries.bodyFatPctTrend[index],
      fatMassTrend: trendSeries.fatMassTrend[index],
      muscleRateTrend: trendSeries.muscleRateTrend[index],
      muscleMassTrend: trendSeries.muscleMassTrend[index],
      visceralFatTrend: trendSeries.visceralFatTrend[index],
      bodyWaterTrend: trendSeries.bodyWaterTrend[index],
    }));
  }, [baseChartData]);

  const toggleCompositeMetric = (key: string) => {
    setActiveCompositeMetrics((prev) => {
      if (prev.includes(key)) {
        return prev.length === 1 ? prev : prev.filter((item) => item !== key);
      }
      return [...prev, key];
    });
  };

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
        dayAfterShot: latestShotDate
          ? getShotCycleDay(latestShotDate, entry.date)
          : 0,
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
    const top =
      Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || "無";
    const avgSeverity = +(
      effected.reduce((sum, e) => sum + num(e.sideEffectSeverity), 0) /
      effected.length
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

  const buildPeriodSummary = (
    periodLabel: string,
    windowEntries: Entry[],
  ) => {
    if (!windowEntries.length) {
      return {
        title: `${periodLabel}尚無資料`,
        summary: `先建立${periodLabel}紀錄後，這裡會自動整理變化。`,
        bullets: ["至少記錄體重與是否施打"],
      };
    }

    const findFirstValue = (key: keyof Entry) =>
      windowEntries.find((entry) => num(entry[key]) > 0) || windowEntries[0];
    const findLastValue = (key: keyof Entry) =>
      [...windowEntries].reverse().find((entry) => num(entry[key]) > 0) ||
      windowEntries[windowEntries.length - 1];

    const weightFirst = findFirstValue("weight");
    const weightLast = findLastValue("weight");
    const bodyFatFirst = findFirstValue("bodyFatPct");
    const bodyFatLast = findLastValue("bodyFatPct");
    const muscleFirst = findFirstValue("muscleMass");
    const muscleLast = findLastValue("muscleMass");

    const weightDelta = +(
      num(weightLast?.weight) - num(weightFirst?.weight)
    ).toFixed(1);
    const bodyFatDelta = +(
      num(bodyFatLast?.bodyFatPct) - num(bodyFatFirst?.bodyFatPct)
    ).toFixed(1);
    const muscleDelta = +(
      num(muscleLast?.muscleMass) - num(muscleFirst?.muscleMass)
    ).toFixed(1);
    const shotDone = windowEntries.some((entry) => entry.isShotDay);
    const stableDays = windowEntries.filter(
      (entry) => entry.appetite === "下降" || entry.cravingLevel !== "高",
    ).length;

    let title = `${periodLabel}持續中`;
    let summary = `${periodLabel}節奏大致穩定，建議繼續維持。`;

    if (weightDelta <= -0.5 && muscleDelta >= -0.2) {
      title = `${periodLabel}減脂表現不錯`;
      summary = `體重下降 ${Math.abs(weightDelta)} kg，肌肉量大致守住，方向不錯。`;
    } else if (weightDelta <= -0.3 && muscleDelta < -0.3) {
      title = `${periodLabel}有下降，但要注意保肌`;
      summary = `體重下降 ${Math.abs(weightDelta)} kg，但肌肉量也掉了 ${Math.abs(muscleDelta)} kg。`;
    } else if (Math.abs(weightDelta) < 0.3) {
      title = `${periodLabel}接近持平`;
      summary = "體重變化不大，可再看外食、零食與步數。";
    } else if (weightDelta > 0.3) {
      title = `${periodLabel}有回升`;
      summary = `體重上升 ${weightDelta} kg，先檢查聚餐、放鬆餐與水分波動。`;
    }

    const bodyFatText =
      num(bodyFatFirst?.bodyFatPct) > 0 && num(bodyFatLast?.bodyFatPct) > 0
        ? `${bodyFatDelta > 0 ? "+" : ""}${bodyFatDelta}%`
        : `${periodLabel}資料不足`;
    const muscleText =
      num(muscleFirst?.muscleMass) > 0 && num(muscleLast?.muscleMass) > 0
        ? `${muscleDelta > 0 ? "+" : ""}${muscleDelta} kg`
        : `${periodLabel}資料不足`;

    const bullets = [
      `體重變化：${weightDelta > 0 ? "+" : ""}${weightDelta} kg`,
      `體脂率變化：${bodyFatText}`,
      `肌肉量變化：${muscleText}`,
      `${periodLabel}施打：${shotDone ? "有紀錄" : "未記錄"}`,
      `相對穩定日數：${stableDays}/${windowEntries.length} 天`,
    ];

    return { title, summary, bullets };
  };

  const weeklySummary = useMemo(() => {
    if (!sortedEntries.length) {
      return buildPeriodSummary("本週", []);
    }

    const latestEntry = sortedEntries[sortedEntries.length - 1];
    const weekStart = getWeekStart(latestEntry.date);
    const windowEntries = sortedEntries.filter(
      (entry) =>
        daysBetween(weekStart, entry.date) >= 0 &&
        daysBetween(entry.date, latestEntry.date) >= 0,
    );

    return buildPeriodSummary("本週", windowEntries);
  }, [sortedEntries]);

  const summaryYearOptions = useMemo(() => {
    const years = Array.from(
      new Set(
        sortedEntries
          .map((entry) => entry.date.split("-")[0])
          .filter(Boolean),
      ),
    ).sort((a, b) => Number(b) - Number(a));

    if (!years.length && selectedSummaryYear) return [selectedSummaryYear];
    return years;
  }, [sortedEntries, selectedSummaryYear]);

  const monthSummary = useMemo(() => {
    if (!selectedSummaryYear || !selectedSummaryMonth) {
      return buildPeriodSummary("月份", []);
    }

    const windowEntries = sortedEntries.filter((entry) => {
      const [year, month] = entry.date.split("-");
      return year === selectedSummaryYear && month === selectedSummaryMonth;
    });

    return buildPeriodSummary(
      `${selectedSummaryYear} 年 ${Number(selectedSummaryMonth)} 月`,
      windowEntries,
    );
  }, [sortedEntries, selectedSummaryYear, selectedSummaryMonth]);

  const overallSummary = useMemo(() => {
    return buildPeriodSummary("整體", sortedEntries);
  }, [sortedEntries]);


  const anomalyAlerts = useMemo(() => {
    const alerts: Array<{ level: "高" | "中"; title: string; detail: string }> =
      [];
    if (!sortedEntries.length || !latest) return alerts;

    const latestEntry = sortedEntries[sortedEntries.length - 1];
    const prevEntry =
      sortedEntries.length >= 2
        ? sortedEntries[sortedEntries.length - 2]
        : null;
    const todayHasLog = sortedEntries.some((entry) => entry.date === today);
    const sevenDayEntries = sortedEntries.filter((entry) => {
      const diff = daysBetween(entry.date, latestEntry.date);
      return diff >= 0 && diff <= 7;
    });

    if (!todayHasLog && daysBetween(latestEntry.date, today) >= 2) {
      alerts.push({
        level: "中",
        title: "有一段時間沒記錄",
        detail: `最近一筆是 ${latestEntry.date}，建議補上體重與施打資訊。`,
      });
    }

    if (prevEntry) {
      const weightJump = +(
        num(latestEntry.weight) - num(prevEntry.weight)
      ).toFixed(1);
      if (weightJump >= 1.2) {
        alerts.push({
          level: "中",
          title: "體重短期上升較快",
          detail: `最近兩筆增加 ${weightJump} kg，先看聚餐、鹽分與水分波動。`,
        });
      }

      const muscleDrop = +(
        num(latestEntry.muscleMass) - num(prevEntry.muscleMass)
      ).toFixed(1);
      const fatPctMove = +(
        num(latestEntry.bodyFatPct) - num(prevEntry.bodyFatPct)
      ).toFixed(1);
      if (muscleDrop <= -0.5 && fatPctMove >= 0) {
        alerts.push({
          level: "高",
          title: "可能有掉肌肉風險",
          detail: `肌肉量下降 ${Math.abs(muscleDrop)} kg，體脂沒有同步改善。`,
        });
      }
    }

    if (sevenDayEntries.length >= 2) {
      const first = sevenDayEntries[0];
      const last = sevenDayEntries[sevenDayEntries.length - 1];
      const weekWeightDelta = +(num(last.weight) - num(first.weight)).toFixed(
        1,
      );
      if (weekWeightDelta >= 1) {
        alerts.push({
          level: "中",
          title: "本週有明顯回升",
          detail: `近 7 天增加 ${weekWeightDelta} kg，建議先收斂放鬆餐。`,
        });
      }
    }

    if (shotStatus.overdueDays > 0) {
      alerts.push({
        level: "高",
        title: "施打日已逾期",
        detail: `目前已超過 ${shotStatus.overdueDays} 天，可記錄補打後重新對齊。`,
      });
    }

    return alerts.slice(0, 4);
  }, [sortedEntries, latest, today, shotStatus.overdueDays]);

  const dashboardSummary = useMemo(() => {
    return [
      { label: "今日體重", value: latestWeight ? `${latestWeight} kg` : "-" },
      { label: "BMI", value: bmi ? `${bmi}・${bmiLabel}` : "-" },
      {
        label: "下次施打",
        value:
          nextShot.text === "-"
            ? "未設定"
            : `${nextShot.text}${nextShot.date !== "-" ? `・${nextShot.date}` : ""}`,
      },
      {
        label: "本週變化",
        value: `${recent7Delta > 0 ? "+" : ""}${recent7Delta} kg`,
      },
      { label: "建議熱量", value: cutCalories ? `${cutCalories} kcal` : "-" },
      {
        label: "剩餘藥量",
        value: `${penInventorySummary.remainGrids || 0} 格`,
      },
    ];
  }, [
    latestWeight,
    bmi,
    bmiLabel,
    nextShot.text,
    nextShot.date,
    recent7Delta,
    cutCalories,
    penInventorySummary.remainGrids,
  ]);

  const workoutPlan = useMemo(() => {
    return buildWorkoutPlan(
      settings.sex,
      workoutLevel,
      workoutStyle,
      workoutEquipments,
      today,
    );
  }, [settings.sex, workoutLevel, workoutStyle, workoutEquipments, today]);

  const workoutQuickTips = useMemo(() => {
    const tips = [
      workoutStyle === "easy"
        ? "今天以好完成為主，不求爆。"
        : "今天總量較高，記得把休息抓好。",
      workoutEquipments.includes("kettlebell")
        ? "壺鈴重量以最後 2~3 下明顯吃力，但姿勢不亂為準。"
        : "今天沒有壺鈴時，優先把有氧與核心做完整。",
      settings.sex === "female"
        ? "女性版參數會自動用較保守的重量與速度。"
        : "男性版參數會自動保留較高的重量與有氧設定。",
    ];
    return tips;
  }, [workoutStyle, workoutEquipments, settings.sex]);

  const photoComparison = useMemo(() => {
    if (!photoRecords.length) {
      return {
        before: null as PhotoRecord | null,
        after: null as PhotoRecord | null,
        diffDays: 0,
        weightDelta: 0,
        summary: "尚無照片可比較",
      };
    }

    const sortedPhotos = [...photoRecords].sort(
      (a, b) =>
        parseLocalDate(a.date).getTime() - parseLocalDate(b.date).getTime(),
    );
    const before =
      sortedPhotos.find((item) => item.id === photoCompareA) ||
      sortedPhotos[0] ||
      null;
    const after =
      sortedPhotos.find((item) => item.id === photoCompareB) ||
      sortedPhotos[sortedPhotos.length - 1] ||
      null;

    if (!before || !after) {
      return {
        before: null,
        after: null,
        diffDays: 0,
        weightDelta: 0,
        summary: "尚無照片可比較",
      };
    }

    const diffDays = Math.abs(daysBetween(before.date, after.date));
    const beforeWeight = sortedEntries.find(
      (entry) => entry.date === before.date,
    )?.weight;
    const afterWeight = sortedEntries.find(
      (entry) => entry.date === after.date,
    )?.weight;
    const weightDelta =
      beforeWeight && afterWeight
        ? +(num(afterWeight) - num(beforeWeight)).toFixed(1)
        : 0;

    return {
      before,
      after,
      diffDays,
      weightDelta,
      summary:
        before.id === after.id
          ? "目前選到同一張照片，可改選不同日期做對比。"
          : `相隔 ${diffDays} 天${beforeWeight && afterWeight ? `，體重變化 ${weightDelta > 0 ? "+" : ""}${weightDelta} kg` : ""}`,
    };
  }, [photoRecords, photoCompareA, photoCompareB, sortedEntries]);

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
        nextSideEffects.find((item) => item.effect !== "無") ||
        nextSideEffects[0];

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
        nextSideEffects.find((item) => item.effect !== "無") ||
        nextSideEffects[0];

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
      bodyFatPct: "",
      fatMass: "",
      muscleRate: "",
      muscleMass: "",
      visceralFat: "",
      bodyWater: "",
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
        prev.map((item) =>
          item.id === editingId ? { ...form, id: editingId } : item,
        ),
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
      bodyFatPct: item.bodyFatPct || "",
      fatMass: item.fatMass || "",
      muscleRate: item.muscleRate || String(getMuscleRateFromEntry(item) || ""),
      muscleMass: item.muscleMass || "",
      visceralFat: item.visceralFat || "",
      bodyWater: item.bodyWater || "",
      dose: item.dose,
      appetite: item.appetite,
      cravingLevel: item.cravingLevel,
      sideEffect: item.sideEffect,
      sideEffectSeverity: item.sideEffectSeverity || "0",
      sideEffects:
        item.sideEffects && item.sideEffects.length
          ? item.sideEffects
          : [
              {
                effect: item.sideEffect || "無",
                severity: item.sideEffectSeverity || "0",
              },
            ],
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
        bodyFatPct: latest?.bodyFatPct || form.bodyFatPct || "",
        fatMass: latest?.fatMass || form.fatMass || "",
        muscleRate:
          latest?.muscleRate ||
          form.muscleRate ||
          String(getMuscleRateFromEntry(latest) || ""),
        muscleMass: latest?.muscleMass || form.muscleMass || "",
        visceralFat: latest?.visceralFat || form.visceralFat || "",
        bodyWater: latest?.bodyWater || form.bodyWater || "",
        dose: latest?.dose || form.dose || "2.5",
        appetite: latest?.appetite || "正常",
        cravingLevel: latest?.cravingLevel || "中",
        sideEffect: latest?.sideEffect || "無",
        sideEffectSeverity: latest?.sideEffectSeverity || "0",
        sideEffects:
          latest?.sideEffects && latest.sideEffects.length
            ? latest.sideEffects
            : [
                {
                  effect: latest?.sideEffect || "無",
                  severity: latest?.sideEffectSeverity || "0",
                },
              ],
        exerciseMin: latest?.exerciseMin || "0",
        isShotDay: true,
      },
    ]);
  };

  const startNewPenToday = () => {
    setPenInventory((prev) => ({
      ...prev,
      penStartDate: today,
      manualAdjustGrids: "0",
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

  const toggleWorkoutEquipment = (equipment: WorkoutEquipment) => {
    setWorkoutEquipments((prev) => {
      if (prev.includes(equipment)) {
        if (prev.length === 1) return prev;
        return prev.filter((item) => item !== equipment);
      }
      return [...prev, equipment];
    });
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
    if (typeof window !== "undefined" && sessionStorage.getItem(sentKey))
      return;

    const messages: string[] = [];
    const diff =
      nextShot.date && nextShot.date !== "-"
        ? daysBetween(today, nextShot.date)
        : 999;

    if (
      (settings.remindOneDayBefore && diff === 1) ||
      (settings.remindOnShotDay && diff === 0)
    ) {
      messages.push(`施打提醒：${nextShot.text}（${nextShot.date}）`);
    }
    if (
      settings.remindIfNoLogByNight &&
      !sortedEntries.some((e) => e.date === today)
    ) {
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

  const isDark = themeMode === "dark";
  const toggleTheme = () => {
    const nextTheme = isDark ? "light" : "dark";
    setThemeMode(nextTheme);
    if (typeof window !== "undefined") {
      window.localStorage.setItem("mounjaro-theme-mode", nextTheme);
    }
  };

  return (
    <InlineAuthGate>
      <div className={isDark ? "dark-ui" : ""}>
        <style jsx global>{`
          .dark-ui {
            color-scheme: dark;
          }
          .dark-ui .bg-white,
          .dark-ui .bg-white\/90,
          .dark-ui [data-radix-popper-content-wrapper] .bg-white {
            background-color: rgb(15 23 42) !important;
          }
          .dark-ui .bg-slate-50,
          .dark-ui .bg-slate-100,
          .dark-ui .bg-slate-200,
          .dark-ui .bg-emerald-50,
          .dark-ui .bg-amber-50,
          .dark-ui .bg-sky-50 {
            background-color: rgb(30 41 59) !important;
          }
          .dark-ui .border,
          .dark-ui .border-b,
          .dark-ui .border-t,
          .dark-ui .border-slate-200,
          .dark-ui .border-slate-300,
          .dark-ui .border-emerald-200,
          .dark-ui .border-amber-200,
          .dark-ui .border-sky-200,
          .dark-ui .border-rose-200 {
            border-color: rgb(51 65 85) !important;
          }
          .dark-ui .text-slate-900,
          .dark-ui .text-slate-800,
          .dark-ui .text-slate-700,
          .dark-ui .text-slate-600,
          .dark-ui .text-slate-500,
          .dark-ui .text-slate-400,
          .dark-ui .text-black {
            color: rgb(226 232 240) !important;
          }
          .dark-ui .text-emerald-700 {
            color: rgb(110 231 183) !important;
          }
          .dark-ui .text-emerald-600 {
            color: rgb(52 211 153) !important;
          }
          .dark-ui .text-amber-800 {
            color: rgb(253 230 138) !important;
          }
          .dark-ui input,
          .dark-ui select,
          .dark-ui textarea,
          .dark-ui button[variant="outline"],
          .dark-ui [role="combobox"],
          .dark-ui [data-slot="input"] {
            background-color: rgb(15 23 42) !important;
            color: rgb(226 232 240) !important;
            border-color: rgb(71 85 105) !important;
          }
          .dark-ui [data-state="active"] {
            background-color: rgb(51 65 85) !important;
            color: rgb(255 255 255) !important;
          }
          .dark-ui .recharts-cartesian-grid line,
          .dark-ui .recharts-reference-line line {
            stroke: rgb(71 85 105) !important;
          }
          .dark-ui .recharts-text,
          .dark-ui .recharts-legend-item-text {
            fill: rgb(226 232 240) !important;
          }
          .dark-ui .recharts-default-tooltip {
            background-color: rgb(15 23 42) !important;
            border-color: rgb(71 85 105) !important;
          }
          .dark-ui .recharts-tooltip-label,
          .dark-ui .recharts-tooltip-item {
            color: rgb(226 232 240) !important;
          }
        `}</style>
        <div
          className={`touch-feedback w-full max-w-md mx-auto min-h-screen p-3 space-y-4 pb-24 ${isDark ? "bg-slate-950 text-slate-100" : "bg-slate-50 text-slate-900"}`}
        >
          <TouchFeedbackStyles />
          <div className="rounded-2xl bg-white/90 backdrop-blur border p-4 shadow-sm space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h1 className="text-xl font-bold">猛健樂個人版 Pro</h1>
                <p className="text-xs text-slate-500 mt-1">
                  手機 App 版介面｜體重、施打、AI 分析一次看
                </p>
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={toggleTheme}
              >
                {isDark ? (
                  <Sun className="w-4 h-4 mr-1" />
                ) : (
                  <Moon className="w-4 h-4 mr-1" />
                )}
                {isDark ? "淺色" : "深色"}
              </Button>
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
              <Button
                size="sm"
                variant="outline"
                onClick={requestNotificationPermission}
              >
                開啟通知
              </Button>
            </div>

            {(settings.remindOneDayBefore && nextShot.text === "1 天後") ||
            (settings.remindOnShotDay && nextShot.text === "今天") ||
            isELCDDay ||
            shotStatus.overdueDays > 0 ? (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm space-y-1">
                {(settings.remindOneDayBefore && nextShot.text === "1 天後") ||
                (settings.remindOnShotDay && nextShot.text === "今天") ? (
                  <div>
                    🔔 施打提醒：{nextShot.text}（{nextShot.date}）
                  </div>
                ) : null}
                {shotStatus.overdueDays > 0 ? (
                  <div>
                    ⚠️ 已逾期 {shotStatus.overdueDays}{" "}
                    天，可按下方「今天補打」重設基準
                  </div>
                ) : null}
                {isELCDDay ? (
                  <div>🔥 今日 ELCD 啟動中：AI 分數 {elcdStatus.score}</div>
                ) : null}
              </div>
            ) : null}
          </div>

          <Card>
            <CardContent className="p-4 space-y-4">
              <div className="flex items-center justify-between gap-2">
                <div className="text-xl font-bold">首頁儀表板</div>
                <div className="text-sm text-slate-500">基本資訊</div>
              </div>

              <div className="grid gap-3 grid-cols-2">
                <Card>
                  <CardContent className="p-4 space-y-1">
                    <div className="flex items-center gap-2 text-sm">
                      <Scale className="w-4 h-4" />
                      今日體重
                    </div>
                    <div className="text-2xl font-semibold">
                      {latestWeight || "-"}
                    </div>
                    <div className="text-xs text-slate-500">kg</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4 space-y-1">
                    <div className="flex items-center gap-2 text-sm">
                      <HeartPulse className="w-4 h-4" />
                      BMI
                    </div>
                    <div className="text-2xl font-semibold">
                      {bmi || "-"}
                    </div>
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
                    <div className="text-[11px] text-slate-400">
                      {settings.bmrMethod === "katch" ? "使用體脂器公式" : "使用 Mifflin 公式"}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4 space-y-1">
                    <div className="flex items-center gap-2 text-sm">
                      <Flame className="w-4 h-4" />
                      建議熱量
                    </div>
                    <div className="text-2xl font-semibold">{cutCalories || "-"}</div>
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

                <Card>
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center gap-2 text-sm">
                      <Syringe className="w-4 h-4" />
                      剩餘藥量
                    </div>

                    <div className="flex items-end gap-3">
                      <div className="text-2xl font-semibold leading-none">
                        {penInventorySummary.remainGrids} 格
                      </div>
                      <div className="text-sm text-slate-500 leading-none">
                        {penInventorySummary.remainMg} mg
                      </div>
                    </div>

                    <div className="text-[11px] text-slate-400">
                      當前藥筆劑量：{penInventorySummary.strength || "-"} mg
                    </div>

                    <div className="space-y-1 rounded-xl border bg-slate-50 p-2">
                      {penInventorySummary.supportedDoses.length ? (
                        penInventorySummary.supportedDoses.map((item) => (
                          <div
                            key={item.dose}
                            className="flex items-center justify-between text-[11px]"
                          >
                            <span className="text-slate-500">
                              {item.dose}mg 還可以打
                            </span>
                            <span className="font-medium text-slate-700">
                              {item.fullShots} 針
                            </span>
                          </div>
                        ))
                      ) : (
                        <div className="text-[11px] text-slate-500">
                          請先設定目前藥筆劑量
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-3 grid-cols-1">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Syringe className="w-4 h-4" />
                  本週施打狀態
                </div>
                <div className="text-lg font-semibold">{shotStatus.status}</div>
                <div className="text-sm text-slate-500">{shotStatus.text}</div>
                {shotCycleDay ? (
                  <div className="text-sm mt-2">
                    目前為施打後第 {shotCycleDay} 天
                  </div>
                ) : null}
                <div className="flex gap-2 mt-3">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={catchUpShotToday}
                  >
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
                  {settings.elcdMode
                    ? isELCDDay
                      ? "今天啟動"
                      : "今天不啟動"
                    : "未開啟"}
                </div>
                <div className="text-sm text-slate-500">
                  AI 分數：{elcdStatus.score}
                </div>
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
                <div className="text-xl font-semibold">
                  約 {weeklyLoss || 0} kg/週
                </div>
                <div className="text-sm text-slate-500 mt-1">
                  近 7 天變化 {recent7Delta} kg
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <Droplets className="w-4 h-4" />
                  水分/脂肪判斷
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">{waterVsFat.tag}</Badge>
                  <Badge
                    variant={
                      waterVsFat.confidence === "高"
                        ? "default"
                        : waterVsFat.confidence === "中"
                          ? "secondary"
                          : "outline"
                    }
                  >
                    信心 {waterVsFat.confidence}
                  </Badge>
                </div>
                <div className="text-sm font-medium">{waterVsFat.title}</div>
                <div className="text-sm text-slate-500">
                  {waterVsFat.detail}
                </div>
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

          <CompositeMetricsCard
            title="各項指標綜合曲線圖"
            data={chartData}
            activeKeys={activeCompositeMetrics}
            onToggleKey={toggleCompositeMetric}
            onExpand={() =>
              setExpandedChart({
                type: "composite",
                title: "各項指標綜合曲線圖",
              })
            }
          />

          <div className="grid gap-4 grid-cols-1">
            {[
              { label: "本週摘要", data: weeklySummary },
                            { label: "整體摘要", data: overallSummary },
            ].map((section) => (
              <Card key={section.label}>
                <CardHeader>
                  <CardTitle>{section.label}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="text-lg font-semibold">
                    {section.data.title}
                  </div>
                  <div className="text-slate-500">{section.data.summary}</div>
                  {section.data.bullets.map((item) => (
                    <div key={item}>• {item}</div>
                  ))}
                </CardContent>
              </Card>
            ))}

            <Card>
              <CardHeader>
                <CardTitle>月份摘要</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>年份</Label>
                    <Select
                      value={selectedSummaryYear}
                      onValueChange={setSelectedSummaryYear}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="選擇年份" />
                      </SelectTrigger>
                      <SelectContent>
                        {summaryYearOptions.length ? (
                          summaryYearOptions.map((year) => (
                            <SelectItem key={year} value={year}>
                              {year} 年
                            </SelectItem>
                          ))
                        ) : (
                          <SelectItem value="no-year" disabled>
                            無可選年份
                          </SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>月份</Label>
                    <Select
                      value={selectedSummaryMonth}
                      onValueChange={setSelectedSummaryMonth}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="選擇月份" />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 12 }, (_, index) => {
                          const monthValue = String(index + 1).padStart(2, "0");
                          return (
                            <SelectItem key={monthValue} value={monthValue}>
                              {index + 1} 月
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="text-lg font-semibold">
                  {monthSummary.title}
                </div>
                <div className="text-slate-500">{monthSummary.summary}</div>
                {monthSummary.bullets.map((item) => (
                  <div key={item}>• {item}</div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>異常提醒</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {anomalyAlerts.length ? (
                  anomalyAlerts.map((alert) => (
                    <div
                      key={`${alert.title}-${alert.detail}`}
                      className={`rounded-xl border p-3 ${alert.level === "高" ? "border-red-200 bg-red-50" : "border-amber-200 bg-amber-50"}`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="font-medium">{alert.title}</div>
                        <Badge
                          variant={
                            alert.level === "高" ? "destructive" : "secondary"
                          }
                        >
                          {alert.level}
                        </Badge>
                      </div>
                      <div className="mt-1 text-slate-600">{alert.detail}</div>
                    </div>
                  ))
                ) : (
                  <div className="text-slate-500">目前沒有明顯異常提醒。</div>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Target className="w-4 h-4" />
                  目標進度
                </span>
                <span className="font-semibold">{progress}%</span>
              </div>

              <div className="relative h-5 w-full overflow-hidden rounded-full border border-slate-300 bg-slate-200 shadow-inner">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-green-600 transition-all duration-500"
                  style={{ width: `${progress}%` }}
                />
                <div className="absolute inset-0 flex items-center justify-center text-[11px] font-bold text-slate-700">
                  {progress}%
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 text-sm">
                <div className="rounded-lg border bg-white p-2">
                  <div className="text-slate-500 text-xs">起始</div>
                  <div className="font-semibold">
                    {sortedEntries.length ? sortedEntries[0].weight : "-"} kg
                  </div>
                </div>

                <div className="rounded-lg border bg-white p-2">
                  <div className="text-slate-500 text-xs">目前</div>
                  <div className="font-semibold">{latestWeight || "-"} kg</div>
                </div>

                <div className="rounded-lg border bg-white p-2">
                  <div className="text-slate-500 text-xs">目標</div>
                  <div className="font-semibold">{settings.goal || "-"} kg</div>
                </div>
              </div>

              <div className="text-sm text-slate-500">
                理想體重區間：約 {idealRange.low || "-"} ~{" "}
                {idealRange.high || "-"} kg
              </div>
            </CardContent>
          </Card>

          <Tabs defaultValue="add" className="space-y-4">
            <div className="-mx-1 overflow-x-auto pb-1">
              <TabsList className="inline-flex h-auto w-max min-w-full gap-1 rounded-2xl bg-white p-1 shadow-sm">
                <TabsTrigger
                  value="settings"
                  className="rounded-xl shrink-0 px-4"
                >
                  設定
                </TabsTrigger>
                <TabsTrigger value="add" className="rounded-xl shrink-0 px-4">
                  新增
                </TabsTrigger>
                <TabsTrigger value="chart" className="rounded-xl shrink-0 px-4">
                  趨勢
                </TabsTrigger>
                <TabsTrigger value="ai" className="rounded-xl shrink-0 px-4">
                  菜單
                </TabsTrigger>
                <TabsTrigger
                  value="workout"
                  className="rounded-xl shrink-0 px-4"
                >
                  運動
                </TabsTrigger>
                <TabsTrigger
                  value="strategy"
                  className="rounded-xl shrink-0 px-4"
                >
                  策略
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
                        onChange={(e) =>
                          setForm({ ...form, date: e.target.value })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>體重 (kg)</Label>
                      <Input
                        placeholder="體重"
                        value={form.weight}
                        onChange={(e) =>
                          setForm({ ...form, weight: e.target.value })
                        }
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>體脂率 (%)</Label>
                      <Input
                        placeholder="例如 32.5"
                        value={form.bodyFatPct}
                        onChange={(e) =>
                          setForm({ ...form, bodyFatPct: e.target.value })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>脂肪重 (kg)</Label>
                      <Input
                        placeholder="例如 15.7"
                        value={form.fatMass}
                        onChange={(e) =>
                          setForm({ ...form, fatMass: e.target.value })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>肌肉率 (%)</Label>
                      <Input
                        placeholder="例如 52.1"
                        value={form.muscleRate}
                        onChange={(e) =>
                          setForm({ ...form, muscleRate: e.target.value })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>肌肉量 (kg)</Label>
                      <Input
                        placeholder="例如 54.2"
                        value={form.muscleMass}
                        onChange={(e) =>
                          setForm({ ...form, muscleMass: e.target.value })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>內臟脂肪</Label>
                      <Input
                        placeholder="例如 12"
                        value={form.visceralFat}
                        onChange={(e) =>
                          setForm({ ...form, visceralFat: e.target.value })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>水分 (%)</Label>
                      <Input
                        placeholder="例如 46.8"
                        value={form.bodyWater}
                        onChange={(e) =>
                          setForm({ ...form, bodyWater: e.target.value })
                        }
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-3">
                    <div className="space-y-2">
                      <Label>劑量</Label>
                      <Select
                        value={form.dose}
                        onValueChange={(v) => setForm({ ...form, dose: v })}
                      >
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
                        onChange={(e) =>
                          setForm({ ...form, exerciseMin: e.target.value })
                        }
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
                      onChange={(e) =>
                        setForm({ ...form, isShotDay: e.target.checked })
                      }
                    />
                  </div>

                  <div className="grid grid-cols-1 gap-3">
                    <div className="space-y-2">
                      <Label>食慾</Label>
                      <Select
                        value={form.appetite}
                        onValueChange={(v: Appetite) =>
                          setForm({ ...form, appetite: v })
                        }
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
                        onValueChange={(v: CravingLevel) =>
                          setForm({ ...form, cravingLevel: v })
                        }
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
                        <Button
                          type="button"
                          size="sm"
                          onClick={addSideEffectField}
                        >
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
                              <div className="text-sm font-medium text-slate-600">
                                副作用 {index + 1}
                              </div>
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
                                  <SelectItem value="胃食道逆流">
                                    胃食道逆流
                                  </SelectItem>
                                  <SelectItem value="頭暈">頭暈</SelectItem>
                                  <SelectItem value="疲倦">疲倦</SelectItem>
                                  <SelectItem value="注射部位不適">
                                    注射部位不適
                                  </SelectItem>
                                </SelectContent>
                              </Select>
                            </div>

                            <div className="space-y-2">
                              <Label>不適程度（0~5）</Label>
                              <Input
                                placeholder="0~5"
                                value={item.severity}
                                onChange={(e) =>
                                  updateSideEffectField(
                                    index,
                                    "severity",
                                    e.target.value,
                                  )
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
                      <div className="text-sm text-slate-500">
                        目前還沒有紀錄
                      </div>
                    ) : (
                      [...sortedEntries].reverse().map((item) => (
                        <div
                          key={item.id}
                          className="rounded-xl border p-3 space-y-2"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="text-sm space-y-1">
                              <div className="font-medium">
                                {item.date} ・ {item.dose} mg{" "}
                                {item.isShotDay ? "・ 施打日" : ""}
                              </div>
                              <div>體重：{item.weight} kg</div>
                              <div>
                                體脂：{item.bodyFatPct || "-"}%｜脂肪重：
                                {item.fatMass || "-"} kg｜肌肉率：
                                {getMuscleRateFromEntry(item) || "-"}%｜肌肉量：
                                {item.muscleMass || "-"} kg
                              </div>
                              <div>
                                內臟脂肪：{item.visceralFat || "-"}｜水分：
                                {item.bodyWater || "-"}%
                              </div>
                              <div>
                                食慾：{item.appetite}｜嘴饞：{item.cravingLevel}
                              </div>
                              <div>
                                副作用：
                                {item.sideEffects && item.sideEffects.length
                                  ? item.sideEffects
                                      .map(
                                        (se) =>
                                          `${se.effect}（${se.severity || 0}/5）`,
                                      )
                                      .join("、")
                                  : `${item.sideEffect}（${item.sideEffectSeverity || 0}/5）`}
                                ｜ 運動：{item.exerciseMin || 0} 分鐘
                              </div>
                              {item.isShotDay ? (
                                <div className="text-emerald-600">
                                  💉 施打日
                                </div>
                              ) : null}
                            </div>

                            <div className="flex gap-2">
                              <Button
                                size="icon"
                                variant="outline"
                                onClick={() => handleEdit(item)}
                              >
                                <Pencil className="w-4 h-4" />
                              </Button>
                              <Button
                                size="icon"
                                variant="outline"
                                onClick={() => handleDelete(item.id)}
                              >
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
                <MetricLineCard
                  title="體重趨勢"
                  data={chartData}
                  dataKey="weight"
                  unit="kg"
                  strokeColor={METRIC_COLORS.weight}
                  goalValue={num(settings.goal) || null}
                  onExpand={() =>
                    setExpandedChart({
                      type: "metric",
                      key: "weight",
                      title: "體重趨勢",
                      unit: "kg",
                      goalValue: num(settings.goal) || null,
                    })
                  }
                  height={260}
                />

                <CompositeMetricsCard
                  title="各項指標綜合曲線圖"
                  data={chartData}
                  activeKeys={activeCompositeMetrics}
                  onToggleKey={toggleCompositeMetric}
                  onExpand={() =>
                    setExpandedChart({
                      type: "composite",
                      title: "各項指標綜合曲線圖",
                    })
                  }
                />

                {[
                  {
                    key: "bodyFatPct",
                    title: "體脂率趨勢",
                    unit: "%",
                    color: METRIC_COLORS.bodyFatPct,
                  },
                  {
                    key: "fatMass",
                    title: "脂肪重趨勢",
                    unit: "kg",
                    color: METRIC_COLORS.fatMass,
                  },
                  {
                    key: "muscleRate",
                    title: "肌肉率趨勢",
                    unit: "%",
                    color: METRIC_COLORS.muscleRate,
                  },
                  {
                    key: "muscleMass",
                    title: "肌肉量趨勢",
                    unit: "kg",
                    color: METRIC_COLORS.muscleMass,
                  },
                  {
                    key: "visceralFat",
                    title: "內臟脂肪趨勢",
                    unit: "",
                    color: METRIC_COLORS.visceralFat,
                  },
                  {
                    key: "bodyWater",
                    title: "水分趨勢",
                    unit: "%",
                    color: METRIC_COLORS.bodyWater,
                  },
                ].map((metric) => (
                  <MetricLineCard
                    key={metric.key}
                    title={metric.title}
                    data={chartData}
                    dataKey={metric.key}
                    unit={metric.unit}
                    strokeColor={metric.color}
                    onExpand={() =>
                      setExpandedChart({
                        type: "metric",
                        key: metric.key,
                        title: metric.title,
                        unit: metric.unit,
                      })
                    }
                  />
                ))}

                <Card>
                  <CardHeader>
                    <CardTitle>分析摘要</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    <div>
                      停滯期：
                      <Badge
                        variant={
                          plateau.isPlateau ? "destructive" : "secondary"
                        }
                      >
                        {plateau.isPlateau ? "可能停滯" : "正常"}
                      </Badge>
                    </div>
                    <div>{plateau.text}</div>
                    <div>估算體脂：{bodyFat || "-"}%</div>
                    <div>最新肌肉率：{latestMuscleRate || "-"}%</div>
                    <div>
                      7日移動平均：
                      {chartData.length
                        ? chartData[chartData.length - 1].avg7
                        : "-"}{" "}
                      kg
                    </div>
                    <div>
                      BMR：{bmr || "-"} kcal（
                      {settings.bmrMethod === "katch"
                        ? "體脂器公式"
                        : "一般公式"}
                      ）
                    </div>
                    <div>TDEE：{tdee || "-"} kcal</div>
                    <div>建議減脂熱量：{cutCalories || "-"} kcal</div>
                    <div>
                      性別版型：
                      {settings.sex === "female" ? "女性建議" : "男性建議"}
                    </div>
                    <div>
                      水分/脂肪判斷：{waterVsFat.title}（信心{" "}
                      {waterVsFat.confidence}）
                    </div>
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
                    <div className="text-slate-500">
                      目前算法：
                      {settings.bmrMethod === "katch"
                        ? "體脂器公式（瘦體重導向）"
                        : "一般公式（體重 / 身高 / 年齡 / 性別）"}
                    </div>
                    <div className="text-emerald-700">
                      {settings.bmrMethod === "katch"
                        ? "飲食指南會更重視保肌：每餐優先蛋白質、避免熱量降太低。"
                        : "飲食指南以一般減脂熱量控制為主，適合沒有穩定體脂器資料時使用。"}
                    </div>
                    <div className="text-emerald-700">
                      {bodyCompositionMenuHint}
                    </div>
                  </div>
                  <CardContent className="space-y-4">
                    {mealPlans.map((plan) => (
                      <div
                        key={plan.title}
                        className="border rounded-xl p-3 space-y-2"
                      >
                        <div className="font-medium">{plan.title}</div>
                        {plan.meals.map((meal) => (
                          <div key={meal.name}>
                            <div className="text-sm font-medium">
                              {meal.name}
                            </div>
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

            <TabsContent value="workout">
              <div className="grid gap-4 grid-cols-1">
                <Card>
                  <CardHeader>
                    <CardTitle>運動建議</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label>想用的器材</Label>
                      <div className="flex flex-wrap gap-2">
                        {(["bike", "treadmill", "kettlebell"] as WorkoutEquipment[]).map((item) => {
  const active = workoutEquipments.includes(item);

  return (
    <button
      key={item}
      type="button"
      onClick={() => toggleWorkoutEquipment(item)}
      className={[
        "rounded-2xl border px-4 py-3 text-sm font-medium transition active:scale-[0.98]",
        isDark
          ? active
            ? "border-white bg-slate-950 shadow-sm ring-2 ring-white/70"
            : "border-slate-400 bg-slate-950"
          : active
            ? "border-slate-900 bg-slate-900 text-white shadow-sm"
            : "border-slate-300 bg-white text-slate-700",
      ].join(" ")}
      style={isDark ? { color: "#ffffff" } : undefined}
      aria-pressed={active}
      aria-label={WORKOUT_EQUIPMENT_LABEL[item]}
      title={WORKOUT_EQUIPMENT_LABEL[item]}
    >
      <span
        className="block text-base font-semibold"
        style={isDark ? { color: "#ffffff" } : undefined}
      >
        {WORKOUT_EQUIPMENT_LABEL[item]}
      </span>
    </button>
  );
})}
                      </div>
                      <div className="text-xs text-slate-500">
                        至少保留一項器材；沒選到壺鈴時，系統會自動改成徒手替代動作。
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label>強度</Label>
                        <Select
                          value={workoutLevel}
                          onValueChange={(v: WorkoutLevel) => setWorkoutLevel(v)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="low">低階</SelectItem>
                            <SelectItem value="mid">中階</SelectItem>
                            <SelectItem value="high">高階</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>模式</Label>
                        <Select
                          value={workoutStyle}
                          onValueChange={(v: WorkoutStyle) => setWorkoutStyle(v)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="easy">輕鬆做</SelectItem>
                            <SelectItem value="hard">操爆版</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="rounded-xl border bg-slate-50 p-3 space-y-1 text-sm">
                      <div className="font-medium">{workoutPlan.title}</div>
                      <div className="text-slate-600">{workoutPlan.subtitle}</div>
                      <div className="text-slate-500">
                        預估時間：{workoutPlan.estimatedMinutes}｜系統依設定性別自動套用重量、速度、坡度與阻力。
                      </div>
                    </div>

                    <div className="space-y-2 text-sm">
                      {workoutQuickTips.map((tip) => (
                        <div key={tip}>• {tip}</div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {workoutPlan.cards.map((card, index) => (
                  <Card key={`${card.id}-${index}`}>
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <div className="text-lg font-semibold">{card.name}</div>
                            <Badge variant="secondary">{card.part}</Badge>
                            <Badge variant="outline">
                              {card.category === "cardio"
                                ? "有氧"
                                : card.category === "strength"
                                  ? "肌力"
                                  : "核心"}
                            </Badge>
                          </div>
                          <div className="mt-1 text-sm text-slate-500">
                            {card.durationText
                              ? `時間：${card.durationText}`
                              : `${card.setsText || ""}${card.repsText ? ` × ${card.repsText}` : ""}`}
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            setOpenWorkoutTeachId((prev) =>
                              prev === card.id ? null : card.id,
                            )
                          }
                        >
                          {openWorkoutTeachId === card.id ? "收合教學" : "動作教學"}
                        </Button>
                      </div>

                      <div className="space-y-1 text-sm">
                        {card.parameterText?.map((item) => (
                          <div key={item}>• {item}</div>
                        ))}
                        {card.restText ? <div>• 組間休息：{card.restText}</div> : null}
                        {card.feeling ? <div>• 感受：{card.feeling}</div> : null}
                      </div>

                      {openWorkoutTeachId === card.id ? (
                        <div className="rounded-xl border bg-slate-50 p-3 space-y-3 text-sm">
                          <div>
                            <div className="font-medium mb-1">怎麼做</div>
                            {card.tutorial.steps.map((step) => (
                              <div key={step}>• {step}</div>
                            ))}
                          </div>
                          <div>
                            <div className="font-medium mb-1">動作重點</div>
                            {card.tutorial.tips.map((tip) => (
                              <div key={tip}>• {tip}</div>
                            ))}
                          </div>
                          <div>
                            <div className="font-medium mb-1">常見錯誤</div>
                            {card.tutorial.mistakes.map((mistake) => (
                              <div key={mistake}>• {mistake}</div>
                            ))}
                          </div>
                          <div>
                            <div className="font-medium mb-1">呼吸方式</div>
                            <div>• {card.tutorial.breathing}</div>
                          </div>
                          <div>
                            <div className="font-medium mb-1">注意事項</div>
                            {card.tutorial.caution.map((item) => (
                              <div key={item}>• {item}</div>
                            ))}
                          </div>
                          <div>
                            <div className="font-medium mb-1">替代動作</div>
                            {card.tutorial.alternatives.map((item) => (
                              <div key={item}>• {item}</div>
                            ))}
                          </div>
                        </div>
                      ) : null}
                    </CardContent>
                  </Card>
                ))}
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
                    <div className="text-sm font-medium mb-1">
                      💉 劑量AI判斷
                    </div>
                    <div className="text-lg font-semibold">{doseAI.level}</div>
                    <div className="text-sm text-slate-500">
                      {doseAI.reason}
                    </div>
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
                            第 {shotEntries.length - index} 針｜{item.date}｜
                            {item.dose} mg
                          </div>
                          {index < shotEntries.length - 1 ? (
                            <div className="text-slate-500">
                              距離前一針{" "}
                              {daysBetween(
                                shotEntries[index + 1].date,
                                item.date,
                              )}{" "}
                              天
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
                        onChange={(e) =>
                          setTempSettings({
                            ...tempSettings,
                            height: e.target.value,
                          })
                        }
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>年齡</Label>
                      <Input
                        value={tempSettings.age}
                        onChange={(e) =>
                          setTempSettings({
                            ...tempSettings,
                            age: e.target.value,
                          })
                        }
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-3">
                    <div className="space-y-2">
                      <Label>目標體重 (kg)</Label>
                      <Input
                        value={tempSettings.goal}
                        onChange={(e) =>
                          setTempSettings({
                            ...tempSettings,
                            goal: e.target.value,
                          })
                        }
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>首次施打日期</Label>
                      <Input
                        type="date"
                        value={tempSettings.firstShotDate}
                        onChange={(e) =>
                          setTempSettings({
                            ...tempSettings,
                            firstShotDate: e.target.value,
                          })
                        }
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>施打間隔（天）</Label>
                      <Input
                        value={tempSettings.shotInterval}
                        onChange={(e) =>
                          setTempSettings({
                            ...tempSettings,
                            shotInterval: e.target.value,
                          })
                        }
                      />
                      <div className="text-xs text-slate-500">
                        猛健樂每週一次請填 7，不要用 8。
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl border bg-slate-50 p-3 text-sm space-y-1">
                    <div className="font-medium">下次施打預覽</div>
                    <div>日期：{previewNextShot.date}</div>
                    <div>狀態：{previewNextShot.text}</div>
                    <div>
                      基準：{previewNextShot.source}（{previewNextShot.baseDate}
                      ）
                    </div>
                    <div className="text-xs text-slate-500">
                      規則：本次施打日 + 間隔天數 = 下次施打日。若每週一次，請填
                      7，這週三打就是下週三打。
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-3">
                    <div className="space-y-2">
                      <Label>性別</Label>
                      <Select
                        value={tempSettings.sex}
                        onValueChange={(v: Sex) =>
                          setTempSettings({ ...tempSettings, sex: v })
                        }
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
                        onValueChange={(v) =>
                          setTempSettings({ ...tempSettings, activity: v })
                        }
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

                    <div className="space-y-2">
                      <Label>基礎代謝率算法</Label>
                      <Select
                        value={tempSettings.bmrMethod}
                        onValueChange={(v: BmrMethod) =>
                          setTempSettings({ ...tempSettings, bmrMethod: v })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="mifflin">
                            一般公式（體重 / 身高 / 年齡 / 性別）
                          </SelectItem>
                          <SelectItem value="katch">
                            體脂器公式（依最新體脂 / 脂肪重）
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <div className="text-xs text-slate-500">
                        {tempSettings.bmrMethod === "katch"
                          ? "優先使用最新脂肪重；若未填脂肪重則改用體脂率推估瘦體重。"
                          : "適合一般情況，依最新體重與基本資料計算。"}
                      </div>
                    </div>

                    <div className="flex items-center justify-between border rounded-xl p-3">
                      <div>
                        <div className="font-medium">通知總開關</div>
                        <div className="text-xs text-slate-500">
                          瀏覽器提醒與頁面提醒
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={tempSettings.notificationsOn}
                        onChange={(e) =>
                          setTempSettings({
                            ...tempSettings,
                            notificationsOn: e.target.checked,
                          })
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
                      <div
                        key={key}
                        className="flex items-center justify-between border rounded-xl p-3"
                      >
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
                        <div className="text-xs text-slate-500">
                          AI 自動判斷是否啟用 ELCD
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={tempSettings.elcdMode}
                        onChange={(e) =>
                          setTempSettings({
                            ...tempSettings,
                            elcdMode: e.target.checked,
                          })
                        }
                      />
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button
                      className="w-full"
                      onClick={() => {
                        setSettings(tempSettings);
                        localStorage.setItem(
                          SETTINGS_KEY,
                          JSON.stringify(tempSettings),
                        );
                      }}
                    >
                      儲存設定
                    </Button>

                    <Button
                      variant="outline"
                      onClick={() => setTempSettings(settings)}
                    >
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
                      本計算機以{" "}
                      <span className="font-medium text-slate-900">
                        轉一圈共 60 格
                      </span>{" "}
                      為基準。
                    </div>

                    <div className="space-y-2">
                      <Label>快速按鈕</Label>
                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                        {penQuickPresets.map((preset) => (
                          <Button
                            key={preset.label}
                            type="button"
                            variant={
                              penStrength === preset.strength &&
                              targetDose === preset.dose
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
                        <Select
                          value={penStrength}
                          onValueChange={setPenStrength}
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
                        <Label>想注射的劑量（mg）</Label>
                        <Input
                          value={targetDose}
                          onChange={(e) => setTargetDose(e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                      <div className="rounded-xl border bg-slate-50 p-3">
                        <div className="text-slate-500">換算比例</div>
                        <div className="text-lg font-semibold">
                          {penCalc.ratio}%
                        </div>
                      </div>
                      <div className="rounded-xl border bg-emerald-50 p-3 border-emerald-200">
                        <div className="text-emerald-700">本次需轉</div>
                        <div className="text-2xl font-bold text-emerald-700">
                          {penCalc.clicks} 格
                        </div>
                      </div>
                      <div className="rounded-xl border bg-slate-50 p-3">
                        <div className="text-slate-500">剩餘格數</div>
                        <div className="text-lg font-semibold">
                          {penCalc.remainClicks} 格
                        </div>
                      </div>
                    </div>

                    {!penCalc.valid ? (
                      <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-amber-800">
                        目標劑量不可大於藥筆總劑量，請重新輸入。
                      </div>
                    ) : null}

                    <div className="rounded-xl border p-3 space-y-2">
                      <div className="font-medium">常用對照</div>
                      <div className="text-sm text-slate-600">
                        10 mg 筆打 2.5 mg：約 15 格
                      </div>
                      <div className="text-sm text-slate-600">
                        10 mg 筆打 5 mg：約 30 格
                      </div>
                      <div className="text-sm text-slate-600">
                        15 mg 筆打 10 mg：約 40 格
                      </div>
                    </div>

                    <div className="text-xs text-slate-500">
                      計算方式：目標劑量 ÷ 藥筆總劑量 × 60
                      格。使用前仍請以實際藥筆刻度與醫囑為準。
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>劑量提升提醒</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    <div className="text-lg font-semibold">
                      {doseEscalationPlan.title}
                    </div>
                    <div className="text-slate-500">
                      {doseEscalationPlan.subtitle}
                    </div>
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
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label>目前正在施打的筆規格</Label>
                        <Select
                          value={penInventory.penStrength}
                          onValueChange={(v) =>
                            setPenInventory({ ...penInventory, penStrength: v })
                          }
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
                        <Label>總可用格數</Label>
                        <Input
                          value={penInventory.totalGrids}
                          onChange={(e) =>
                            setPenInventory({
                              ...penInventory,
                              totalGrids: e.target.value,
                            })
                          }
                        />
                        <div className="text-xs text-slate-500">
                          預設 240；若把殘劑算進去可改 300。
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label>目前這支筆開始日</Label>
                        <Input
                          type="date"
                          value={penInventory.penStartDate}
                          onChange={(e) =>
                            setPenInventory({
                              ...penInventory,
                              penStartDate: e.target.value,
                            })
                          }
                        />
                        <div className="text-xs text-slate-500">
                          只會統計這個日期之後的施打日紀錄。
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label>手動校正格數</Label>
                        <Input
                          value={penInventory.manualAdjustGrids}
                          onChange={(e) =>
                            setPenInventory({
                              ...penInventory,
                              manualAdjustGrids: e.target.value,
                            })
                          }
                        />
                        <div className="text-xs text-slate-500">
                          可用來補殘劑、修正誤差或對齊實際剩餘量。
                        </div>
                      </div>
                    </div>

                    <Button
                      type="button"
                      variant="outline"
                      className="w-full"
                      onClick={startNewPenToday}
                    >
                      開始新筆（從今天重新計算）
                    </Button>

                    <div className="rounded-xl border bg-slate-50 p-3 space-y-1">
                      <div>每支藥筆都是轉滿 60 格 = 該支筆的標示劑量。</div>
                      <div>
                        目前規格：{penInventorySummary.strength || "-"} mg / 支
                      </div>
                      <div>
                        每 1 格約 {penInventorySummary.mgPerGrid || 0} mg
                      </div>
                      <div>
                        目前統計到{" "}
                        {penInventorySummary.shotEntriesSinceStartCount}{" "}
                        次施打日紀錄。
                      </div>
                      <div>4 次 ≈ 1 個月，可用來估算可打月數。</div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                      <div className="rounded-xl border p-3">
                        <div className="text-slate-500">總可用格數</div>
                        <div className="text-lg font-semibold">
                          {penInventorySummary.totalGrids}
                        </div>
                      </div>
                      <div className="rounded-xl border p-3">
                        <div className="text-slate-500">紀錄自動抓取</div>
                        <div className="text-lg font-semibold">
                          {penInventorySummary.autoUsedGrids}
                        </div>
                      </div>
                      <div className="rounded-xl border p-3">
                        <div className="text-slate-500">校正後已使用</div>
                        <div className="text-lg font-semibold">
                          {penInventorySummary.usedGrids}
                        </div>
                      </div>
                      <div className="rounded-xl border p-3">
                        <div className="text-slate-500">剩餘格數</div>
                        <div className="text-lg font-semibold">
                          {penInventorySummary.remainGrids}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div className="rounded-xl border p-3 space-y-1">
                        <div className="text-slate-500">剩餘藥量</div>
                        <div className="text-lg font-semibold">
                          {penInventorySummary.remainMg} mg
                        </div>
                        <div className="text-xs text-slate-500">
                          依目前筆規格換算。
                        </div>
                      </div>

                      {penInventorySummary.targetDosePlan &&
                      penInventorySummary.targetDosePlan.dose > 0 ? (
                        <div className="rounded-xl border border-sky-200 bg-sky-50 p-3 space-y-1">
                          <div className="font-medium">
                            依藥量計算機目標劑量試算
                          </div>
                          <div>
                            目標劑量：{penInventorySummary.targetDosePlan.dose}{" "}
                            mg
                          </div>
                          <div>
                            每次需：
                            {penInventorySummary.targetDosePlan.gridsNeeded} 格
                          </div>
                          <div>
                            還可完整打{" "}
                            {penInventorySummary.targetDosePlan.fullShots} 次
                            （精算約{" "}
                            {penInventorySummary.targetDosePlan.exactShots} 次）
                          </div>
                          <div>
                            約可打 {penInventorySummary.targetDosePlan.months}{" "}
                            個月
                          </div>
                        </div>
                      ) : (
                        <div className="rounded-xl border p-3 space-y-1">
                          <div className="font-medium">
                            依藥量計算機目標劑量試算
                          </div>
                          <div className="text-slate-500">
                            先在上方藥量計算機輸入目標劑量。
                          </div>
                        </div>
                      )}
                    </div>

                    {penInventorySummary.latestDosePlan ? (
                      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 space-y-1">
                        <div className="font-medium">
                          依最近一次施打劑量試算
                        </div>
                        <div>
                          最近一次劑量：
                          {penInventorySummary.latestDosePlan.dose} mg
                        </div>
                        <div>
                          每次需：
                          {penInventorySummary.latestDosePlan.gridsNeeded} 格
                        </div>
                        <div>
                          還可完整打{" "}
                          {penInventorySummary.latestDosePlan.fullShots} 次
                          （精算約{" "}
                          {penInventorySummary.latestDosePlan.exactShots} 次）
                        </div>
                        <div>
                          約可打 {penInventorySummary.latestDosePlan.months}{" "}
                          個月
                        </div>
                      </div>
                    ) : null}

                    <div className="space-y-2">
                      <div className="font-medium">常用劑量剩餘可打次數</div>
                      <div className="space-y-2">
                        {penInventorySummary.supportedDoses.map((item) => (
                          <div
                            key={item.dose}
                            className="rounded-xl border p-3 space-y-1"
                          >
                            <div className="font-medium">{item.dose} mg</div>
                            <div className="text-slate-500">
                              每次需 {item.gridsNeeded} 格
                            </div>
                            <div>
                              還可完整打 {item.fullShots} 次（精算約{" "}
                              {item.exactShots} 次）
                            </div>
                            <div className="text-slate-500">
                              約 {item.months} 個月（4 次 = 1 個月）
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
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
                      照片會跟著目前資料一起保留。
                    </div>

                    <div className="rounded-xl border p-3 space-y-3">
                      <div className="font-medium">Before / After 對比</div>
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <div className="space-y-2">
                          <Label>比較圖 A</Label>
                          <Select
                            value={photoCompareA}
                            onValueChange={setPhotoCompareA}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="選擇較早照片" />
                            </SelectTrigger>
                            <SelectContent>
                              {photoRecords.map((record) => (
                                <SelectItem
                                  key={`a-${record.id}`}
                                  value={record.id}
                                >
                                  {record.date}｜{record.note || "未備註"}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>比較圖 B</Label>
                          <Select
                            value={photoCompareB}
                            onValueChange={setPhotoCompareB}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="選擇較晚照片" />
                            </SelectTrigger>
                            <SelectContent>
                              {photoRecords.map((record) => (
                                <SelectItem
                                  key={`b-${record.id}`}
                                  value={record.id}
                                >
                                  {record.date}｜{record.note || "未備註"}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="text-sm text-slate-600">
                        {photoComparison.summary}
                      </div>

                      {photoComparison.before && photoComparison.after ? (
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-2">
                            <div className="text-xs font-medium">
                              Before｜{photoComparison.before.date}
                            </div>
                            <img
                              src={photoComparison.before.imageData}
                              alt={
                                photoComparison.before.note ||
                                photoComparison.before.date
                              }
                              className="h-48 w-full rounded-lg object-cover"
                            />
                            <div className="text-xs text-slate-500">
                              {photoComparison.before.note || "-"}
                            </div>
                          </div>
                          <div className="space-y-2">
                            <div className="text-xs font-medium">
                              After｜{photoComparison.after.date}
                            </div>
                            <img
                              src={photoComparison.after.imageData}
                              alt={
                                photoComparison.after.note ||
                                photoComparison.after.date
                              }
                              className="h-48 w-full rounded-lg object-cover"
                            />
                            <div className="text-xs text-slate-500">
                              {photoComparison.after.note || "-"}
                            </div>
                          </div>
                        </div>
                      ) : null}
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      {photoRecords.length === 0 ? (
                        <div className="text-slate-500">尚無照片紀錄</div>
                      ) : (
                        photoRecords.map((record) => (
                          <div
                            key={record.id}
                            className="rounded-xl border p-2 space-y-2"
                          >
                            <img
                              src={record.imageData}
                              alt={record.note || record.date}
                              className="h-40 w-full rounded-lg object-cover"
                            />
                            <div className="text-xs font-medium">
                              {record.date}
                            </div>
                            <div className="text-xs text-slate-500">
                              {record.note || "-"}
                            </div>
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
              </div>
            </TabsContent>

            <TabsContent value="cheat">
              <div className="grid gap-4 grid-cols-1">
                <Card>
                  <CardHeader>
                    <CardTitle>🤖 智能放鬆餐判斷</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="text-xl font-semibold">
                      {cheatDecision.level}
                    </div>
                    <div className="text-sm text-slate-500">
                      原因：{cheatDecision.reason}
                    </div>
                    <div className="rounded-xl border bg-slate-50 p-3 text-sm">
                      原則：{cheatDecision.rule}
                    </div>
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

                <Card>
                  <CardHeader>
                    <CardTitle>外食放鬆餐範例</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {cheatRestaurantOptions.map((option) => (
                      <div
                        key={option.brand}
                        className="rounded-xl border p-3 space-y-2"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="font-medium">{option.brand}</div>
                          <Badge variant="outline">{option.title}</Badge>
                        </div>
                        <div className="space-y-1 text-sm text-slate-700">
                          {option.combos.map((combo) => (
                            <div key={combo}>• {combo}</div>
                          ))}
                        </div>
                        <div className="text-xs text-slate-500">
                          {option.note}
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
          {expandedChart ? (
            <div className="fixed inset-0 z-50 bg-black/80 p-3">
              <div className="flex h-full w-full items-center justify-center">
                <div className="relative h-full w-full overflow-hidden rounded-2xl bg-white shadow-2xl">
                  <div className="flex items-center justify-between border-b px-4 py-3">
                    <div>
                      <div className="text-base font-semibold">
                        {expandedChart.title}
                      </div>
                      <div className="text-xs text-slate-500">
                        建議將手機橫向檢視，趨勢會更清楚。
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setExpandedChart(null)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="h-[calc(100%-64px)] overflow-auto p-3">
                    <div className="mx-auto h-full w-full max-w-6xl landscape:max-w-none">
                      {expandedChart.type === "composite" ? (
                        <CompositeMetricsCard
                          title={expandedChart.title}
                          data={chartData}
                          activeKeys={activeCompositeMetrics}
                          onToggleKey={toggleCompositeMetric}
                          fullscreen
                        />
                      ) : expandedChart.key ? (
                        <MetricLineCard
                          title={expandedChart.title}
                          data={chartData}
                          dataKey={expandedChart.key}
                          unit={expandedChart.unit || ""}
                          strokeColor={
                            METRIC_COLORS[expandedChart.key] || "#0f172a"
                          }
                          goalValue={expandedChart.goalValue || null}
                          height={420}
                        />
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </InlineAuthGate>
  );
}

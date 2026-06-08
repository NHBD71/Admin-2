/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from "react";
import { auth, db, handleFirestoreError, OperationType } from "./firebase";
import { onAuthStateChanged, User } from "firebase/auth";
import { collection, onSnapshot, query, orderBy, getDocs, doc, setDoc, Timestamp } from "firebase/firestore";
import { Member, Category } from "./types";
import { MemberCard } from "./components/MemberCard";
import { StatsDashboard } from "./components/StatsDashboard";
import { AdminPanel } from "./components/AdminPanel";
import { OfficialBanner } from "./components/OfficialBanner";
import {
  Users,
  Grid,
  Search,
  Plus,
  Shield,
  Menu,
  X,
  HelpCircle,
  Database,
  ArrowRight,
  RefreshCw,
  Facebook,
  Phone,
  MessageSquare,
  Info,
  BookOpen,
  Lock
} from "lucide-react";

export default function App() {
  // Real-time Firebase Collections state
  const [members, setMembers] = useState<Member[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Authentication access role checks
  const [isAdmin, setIsAdmin] = useState(false);

  // App UI/Navigation state
  const [currentView, setCurrentView] = useState<"directory" | "admin">("directory");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [showMemberModal, setShowMemberModal] = useState(false);
  const [editingMember, setEditingMember] = useState<Member | null>(null);

  // Hidden Master Admin click triggers
  const [logoClicks, setLogoClicks] = useState(0);
  const [lastClickTime, setLastClickTime] = useState(0);

  const handleLogoClickForAdmin = () => {
    const now = Date.now();
    if (now - lastClickTime < 1500) {
      const newCount = logoClicks + 1;
      setLogoClicks(newCount);
      if (newCount >= 5) {
        setCurrentView("admin");
        setLogoClicks(0);
        alert("গোপন অ্যাডমিন প্যানেল সক্রিয় হয়েছে!");
      }
    } else {
      setLogoClicks(1);
    }
    setLastClickTime(now);
  };

  // Agent Verification States
  const [verificationQuery, setVerificationQuery] = useState("");
  const [verificationResult, setVerificationResult] = useState<{
    status: "none" | "success" | "fail";
    agent?: Member;
  } | null>(null);

  // Auto categories seeder message
  const [seedingLoading, setSeedingLoading] = useState(false);

  // Watch Auth status change
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        // Evaluate if user qualifies as administrative (only specified emails)
        const emailLower = user.email?.toLowerCase();
        if (emailLower === "admin9909@gmail.com" || emailLower === "mnshiddik11@gmail.com") {
          setIsAdmin(true);
        } else {
          setIsAdmin(false);
        }
      } else {
        setIsAdmin(false);
      }
    });
    return () => unsubscribe();
  }, []);

  // Real-time listener for Categories
  useEffect(() => {
    const q = query(collection(db, "categories"), orderBy("categoryName", "asc"));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const fetchedCats: Category[] = [];
        snapshot.forEach((doc) => {
          fetchedCats.push({ ...doc.data() } as Category);
        });
        setCategories(fetchedCats);
        setLoading(false);
      },
      (error) => {
        console.error("Firestore Loading error for categories:", error);
        setCategories([]);
        setLoading(false);
      }
    );
    return () => unsubscribe();
  }, []);

  // Real-time listener for Members
  useEffect(() => {
    const q = query(collection(db, "members"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const fetchedMembers: Member[] = [];
        snapshot.forEach((doc) => {
          fetchedMembers.push({ ...doc.data() } as Member);
        });
        setMembers(fetchedMembers);
      },
      (error) => {
        console.error("Firestore Loading error for members:", error);
        setMembers([]);
      }
    );
    return () => unsubscribe();
  }, []);

  // Helper function to seed initial mandatory categories if collection is completely empty
  const seedInitialCategories = async () => {
    setSeedingLoading(true);
    const defaults = [
      { id: "customer-service", categoryName: "Customer Service" },
      { id: "admin", categoryName: "Admin" },
      { id: "sub-admin", categoryName: "Sub Admin" },
      { id: "super-agent", categoryName: "Super Agent" },
      { id: "master-agent", categoryName: "Master Agent" },
    ];

    try {
      for (const item of defaults) {
        const docRef = doc(db, "categories", item.id);
        await setDoc(docRef, {
          id: item.id,
          categoryName: item.categoryName,
          createdAt: Timestamp.now(),
        });
      }
      onRefreshData();
    } catch (err) {
      console.error("Failed to seed initial categories: ", err);
    } finally {
      setSeedingLoading(false);
    }
  };

  const onRefreshData = () => {
    // Standard trigger placeholder
  };

  const handleEditMemberClick = (m: Member) => {
    setEditingMember(m);
    setCurrentView("admin");
    setMobileSidebarOpen(false);
  };

  const handleOpenQuickAdd = () => {
    if (!isAdmin) {
      setCurrentView("admin");
    } else {
      setEditingMember(null);
      setShowMemberModal(true);
      setCurrentView("admin");
    }
    setMobileSidebarOpen(false);
  };

  // Agent Verification Logic
  const handleVerifyAgent = () => {
    if (!verificationQuery.trim()) {
      setVerificationResult({ status: "none" });
      return;
    }
    const queryClean = verificationQuery.toLowerCase().trim().replace(/[^a-z0-9]/g, "");
    if (!queryClean) {
      setVerificationResult({ status: "fail" });
      return;
    }

    // Find agent whose agentId, whatsapp, or imo contains this clean format
    const found = members.find((m) => {
      const matchId = m.agentId?.toLowerCase().trim().replace(/[^a-z0-9]/g, "") === queryClean;
      const matchNameId = m.fullName?.toLowerCase().trim().replace(/[^a-z0-9]/g, "").includes(queryClean);
      const matchWa = m.whatsappNumber?.toLowerCase().trim().replace(/[^a-z0-9]/g, "").includes(queryClean);
      const matchImo = m.imoNumber?.toLowerCase().trim().replace(/[^a-z0-9]/g, "").includes(queryClean);
      return matchId || matchNameId || matchWa || matchImo;
    });

    if (found) {
      setVerificationResult({ status: "success", agent: found });
    } else {
      setVerificationResult({ status: "fail" });
    }
  };

  // Structured query searching logic
  // Searches recursively by:
  // - Full Name (case-insensitive)
  // - WhatsApp number (contains number)
  // - Facebook Profile Link (contains user-written value)
  const filteredMembers = members.filter((m) => {
    // Filter by selected category pill
    if (selectedCategory !== "all" && m.category !== selectedCategory) {
      return false;
    }

    if (!searchQuery.trim()) return true;

    const queryLower = searchQuery.toLowerCase().trim();
    const idMatch = m.agentId?.toLowerCase().includes(queryLower);
    const nameMatch = m.fullName?.toLowerCase().includes(queryLower);
    const whatsappMatch = m.whatsappNumber?.toLowerCase().includes(queryLower);
    const imoMatch = m.imoNumber?.toLowerCase().includes(queryLower);
    const facebookMatch = m.facebookLink?.toLowerCase().includes(queryLower);

    return idMatch || nameMatch || whatsappMatch || imoMatch || facebookMatch;
  });

  return (
    <div className="min-h-screen bg-[#070b13] text-slate-100 flex overflow-hidden relative font-sans">
      
      {/* BACKGROUND MESH ORBS for authentic gaming site feel */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-amber-500/10 rounded-full blur-[130px] select-none pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[10%] w-[400px] h-[400px] bg-[#22c55e]/5 rounded-full blur-[110px] select-none pointer-events-none"></div>

      {/* MOBILE HEADER RESPONSIVE TOP BAR */}
      <header className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-[#0c121e]/85 backdrop-blur-xl border-b border-white/10 flex items-center justify-between px-6 z-40">
        <div className="flex items-center gap-2">
          <div 
            onClick={handleLogoClickForAdmin}
            className="w-9 h-9 bg-amber-500 rounded-lg flex items-center justify-center font-black text-slate-950 text-sm shadow-lg shadow-amber-500/20 cursor-pointer select-none active:scale-95 transition-all"
          >
            9W
          </div>
          <span className="font-black text-sm tracking-tight text-white font-display uppercase">
            9Wickets Agent List
          </span>
        </div>
        <button
          onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
          className="p-2 text-slate-300 hover:text-white"
        >
          {mobileSidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </header>

      {/* SLEEK TRANSLUCENT SIDEBAR (Desktop Fixed, Mobile Overlay) */}
      <aside
        className={`fixed lg:sticky top-0 bottom-0 left-0 w-64 bg-[#090d16]/95 lg:bg-[#070b13]/80 backdrop-blur-3xl border-r border-[#ffffff]/10 flex flex-col z-50 transition-all duration-300 lg:translate-x-0 ${
          mobileSidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="p-6 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div 
              onClick={handleLogoClickForAdmin}
              className="w-9 h-9 bg-[#facc15] rounded-xl flex items-center justify-center font-black text-slate-950 text-md shadow-lg shadow-yellow-500/10 cursor-pointer select-none active:scale-95 transition-all"
            >
              9W
            </div>
            <div>
              <h1 className="text-sm font-black tracking-widest text-[#ffffff] font-display uppercase leading-none">
                9Wickets
              </h1>
              <span className="text-[10px] text-[#facc15] font-black uppercase tracking-widest">
                Agent Directory
              </span>
            </div>
          </div>
          <button className="lg:hidden text-slate-400 hover:text-white" onClick={() => setMobileSidebarOpen(false)}>
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Categories / Navigation Tabs */}
        <div className="p-4 flex-1 space-y-6 overflow-y-auto">
          <div className="space-y-1.5">
            <span className="px-3 text-[10px] font-black uppercase text-slate-500 tracking-wider">
              মেনু / Navigation
            </span>
            <button
              onClick={() => {
                setCurrentView("directory");
                setMobileSidebarOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-all text-xs font-bold leading-none ${
                currentView === "directory"
                  ? "bg-amber-500/10 text-amber-400 border-amber-500/20 shadow-lg shadow-amber-500/5 font-black text-sm"
                  : "border-transparent text-slate-400 hover:bg-white/5 hover:text-white"
              }`}
            >
              <Users className="w-4 h-4 text-amber-400" />
              <span>এজেন্ট লিস্ট ডিরেক্টরি</span>
            </button>

            {isAdmin && (
              <button
                onClick={() => {
                  setCurrentView("admin");
                  setMobileSidebarOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-all text-xs font-bold leading-none ${
                  currentView === "admin"
                    ? "bg-amber-500/10 text-amber-400 border-amber-500/20 shadow-lg shadow-amber-500/5 font-black text-sm"
                    : "border-[#ffffff]/5 text-slate-400 hover:bg-white/5 hover:text-white"
                }`}
              >
                <Shield className="w-4 h-4 text-emerald-400" />
                <span>কনট্রোল ও এডমিন প্যানেল</span>
              </button>
            )}
          </div>

          <div className="space-y-1 py-4 border-t border-white/5">
            <span className="px-3 text-[10px] font-black uppercase text-slate-500 tracking-wider">
              নিরাপত্তা সতর্কতা
            </span>
            <div className="p-3 bg-red-500/5 border border-red-500/15 rounded-xl space-y-1 text-slate-350">
              <p className="text-[10px] font-bold text-red-400 flex items-center gap-1">
                <Shield className="w-3.5 h-3.5 text-red-400" /> প্রতারণা সতর্কতা
              </p>
              <p className="text-[9px] text-slate-400 leading-normal">
                লেনদেনের আগে অবশ্যই তার নম্বর বা আইডিটি উপরে সার্চ বক্সে দিয়ে ভেরিফাই বাটন চাপুন।
              </p>
            </div>
          </div>
        </div>

        {/* User Account / Sign Out Section */}
        {currentUser && isAdmin && (
          <div className="mt-auto p-4 border-t border-white/5 bg-[#090d16]/30 backdrop-blur-md">
            <div className="p-4 bg-emerald-500/5 rounded-2xl border border-emerald-500/20">
              <p className="text-[10px] font-[#10b981] font-semibold text-emerald-400 uppercase tracking-widest mb-1">
                সিস্টেম এডমিন পোর্টাল
              </p>
              <p className="text-xs font-bold text-white truncate max-w-[180px]">
                {currentUser.email}
              </p>
              <button
                onClick={() => {
                  auth.signOut();
                  setCurrentView("directory");
                }}
                className="mt-3 w-full py-2 bg-red-500/10 hover:bg-red-500/25 border border-red-500/20 text-red-350 font-black rounded-lg text-xs transition-all cursor-pointer"
              >
                লগআউট করুন
              </button>
            </div>
          </div>
        )}
      </aside>

      {/* MAIN MAIN CONTENT WORKSPACE VIEW */}
      <main className="flex-1 flex flex-col min-w-0 z-10 pt-16 lg:pt-0 pb-10">
        
        {/* FLASHING RED SCROLLING WARNING MARQUEE */}
        <div className="bg-red-650/85 bg-red-950 border-b border-red-500/30 text-white font-extrabold text-xs py-2.5 px-6 select-none relative overflow-hidden">
          <div className="whitespace-nowrap overflow-hidden">
            <div className="marquee-content inline-block">
              <span className="text-amber-400 font-black">📢 সতর্কবার্তা :</span> এজেন্টদের সাথে লেনদেনের আগে অবশ্যই তাদের এজেন্ট আইডি আমাদের অফিশিয়াল ডিরেক্টরি সার্চ বক্সে দিয়ে ভেরিফাই করুন। প্রতারণা এড়াতে অনলাইন এজেন্ট লিস্ট ছাড়া কারো সাথে লেনদেন করবেন না। তালিকাভুক্ত ছাড়া অন্য কারো সাথে লেনদেন করে প্রতারিত হলে ৯উইকেট কর্তৃপক্ষ দায়ী থাকবে না।
            </div>
          </div>
        </div>

        {/* TOP COMPREHENSIVE SEARCH HEADER PANEL */}
        <header className="h-20 hidden lg:flex items-center justify-between px-10 bg-slate-900/40 backdrop-blur-xl border-b border-white/10 sticky top-0 z-30">
          <div className="relative w-[480px]">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="নাম, হোয়াটসঅ্যাপ, ইমু বা এজেন্ট আইডি দিয়ে সার্চ করুন..."
              className="w-full bg-slate-950/40 border border-white/10 rounded-full py-2.5 pl-12 pr-4 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500/50 text-white placeholder:text-slate-400 transition-all shadow-inner"
            />
            <Search className="w-4 h-4 absolute left-4 top-3 text-slate-400" />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-4 top-2 text-[10px] bg-white/10 hover:bg-white/20 px-2 py-1 rounded text-slate-300"
              >
                মুছুন (Clear)
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleOpenQuickAdd}
              className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-full flex items-center gap-2 font-black text-xs shadow-xl shadow-amber-500/20 active:scale-95 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>এজেন্ট যুক্ত করুন (Add Agent)</span>
            </button>
          </div>
        </header>

        {/* MOBILE RESPONSIVE SEARCH BOX */}
        <div className="lg:hidden p-6 pb-0">
          <div className="relative w-full">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="নাম, WA বা এজেন্ট আইডি দিয়ে সার্চ..."
              className="w-full bg-slate-950/40 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500/50 text-white placeholder:text-slate-400 transition-all shadow-inner"
            />
            <Search className="w-4 h-4 absolute left-4 top-3.5 text-slate-400" />
          </div>
        </div>

        {/* CONTAINER SHELL LAYOUT BODY */}
        <div className="p-6 lg:p-10 flex flex-col gap-8 flex-1">
          {/* Realtime Load-status tracer fallback */}
          {loading ? (
            <div className="flex-1 flex flex-col items-center justify-center space-y-4 py-20">
              <RefreshCw className="w-8 h-8 text-amber-400 animate-spin" />
              <p className="text-xs text-slate-450">৯উইকেট এজেন্ট ডেটাবেজ সিঙ্ক হচ্ছে...</p>
            </div>
          ) : (
            <>
              {currentView === "directory" ? (
                <>
                  {/* Official 9Wickets Brand Header Banner */}
                  <OfficialBanner />

                  {/* Dynamic Category Filtering pills scrolling bar */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between border-b border-white/5 pb-2">
                      <h4 className="text-xs font-black uppercase text-slate-400 tracking-wider flex items-center gap-1.5">
                        <Grid className="w-3.5 h-3.5 text-amber-500" /> এজেন্ট ও এডমিন ক্যাটাগরি ফিল্টার 
                      </h4>
                      {categories.length === 0 && (
                        <button
                          onClick={seedInitialCategories}
                          disabled={seedingLoading}
                          className="text-[10px] text-amber-400 hover:text-amber-300 underline font-black"
                        >
                          {seedingLoading ? "তৈরি হচ্ছে..." : "প্রাথমিক ক্যাটাগরি তৈরি করুন"}
                        </button>
                      )}
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-2.5">
                      <button
                        onClick={() => setSelectedCategory("all")}
                        className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                          selectedCategory === "all"
                            ? "bg-amber-500 text-slate-950 border-amber-500 shadow-lg shadow-amber-500/10 font-black"
                            : "bg-[#0b1220] hover:bg-slate-900 border-white/10 text-slate-300"
                        }`}
                      >
                        হোম (Home)
                      </button>

                      {categories.map((cat) => {
                        const count = members.filter((m) => m.category === cat.id).length;
                        // Helper to translate category display names nicely in Bengali to fit custom request
                        const getCategoryDisplayNameBn = (enName: string) => {
                          const lower = enName.toLowerCase();
                          if (lower.includes("customer")) return "কাস্টমার সার্ভিস (Customer Service)";
                          if (lower === "admin") return "সার্ভিস এডমিন (Admin)";
                          if (lower.includes("sub admin") || lower.includes("sub-admin")) return "সাব এডমিন (Sub Admin)";
                          if (lower.includes("super agent") || lower.includes("super-agent")) return "সুপার এজেন্ট (Super Agent)";
                          if (lower.includes("master agent") || lower.includes("master-agent")) return "মাস্টার এজেন্ট (Master Agent)";
                          return enName;
                        };

                        return (
                          <button
                            key={cat.id}
                            onClick={() => setSelectedCategory(cat.id)}
                            className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                              selectedCategory === cat.id
                                ? "bg-amber-500 text-slate-950 border-amber-500 shadow-lg shadow-amber-500/10 font-black"
                                : "bg-[#0b1220] hover:bg-[#11192b] border-white/10 text-slate-350"
                            }`}
                          >
                            {getCategoryDisplayNameBn(cat.categoryName)} ({count})
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {selectedCategory === "all" && !searchQuery.trim() ? (
                    <div className="space-y-6 animate-fade-in mt-4">
                      {/* Section 1: কিভাবে একাউন্ট খুলবেন? */}
                      <div className="bg-[#0b1220] border-2 border-amber-500/15 rounded-3xl p-6 md:p-8 shadow-2xl relative overflow-hidden">
                        <div className="absolute top-[-20%] right-[-10%] w-44 h-44 bg-amber-500/5 rounded-full blur-[60px] pointer-events-none"></div>
                        <div className="flex flex-col md:flex-row gap-4 items-start relative z-10">
                          <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-2xl text-[#facc15] flex-shrink-0">
                            <HelpCircle className="w-6 h-6" />
                          </div>
                          <div className="space-y-2">
                            <h3 className="text-lg md:text-xl font-black text-amber-400">
                              কিভাবে একাউন্ট খুলবেন?
                            </h3>
                            <p className="text-xs md:text-sm text-slate-300 leading-relaxed font-semibold">
                              nayaludis.live একাউন্ট করতে হলে আপনার এজেন্ট এর মাধ্যমে একাউন্ট খুলতে হবে। এজেন্ট এর মাধ্যমেই টাকা ডিপোজিট এবং উইথড্র করতে হবে। আপনি যে এজেন্ট এর কাছ থেকে একাউন্ট খুলবেন তার সাথেই সব সময় লেনদেন করতে হবে। ঠিক কোন এজেন্ট কে টাকা দিবেন এবং কিভাবে তার সাথে লেনদেন করবেন তার বুঝতে হলে আপনার নিম্বের তথ্য গুলো পড়া জরুরী।
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Section 2: এজেন্ট লিস্টঃ */}
                      <div className="bg-[#0b1220] border border-white/10 rounded-3xl p-6 md:p-8 shadow-2xl space-y-4">
                        <div className="flex flex-col md:flex-row gap-4 items-start">
                          <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl text-indigo-400 flex-shrink-0">
                            <BookOpen className="w-6 h-6" />
                          </div>
                          <div className="space-y-2 flex-1">
                            <h4 className="text-lg font-black text-indigo-400">
                              এজেন্ট লিস্টঃ
                            </h4>
                            <p className="text-xs md:text-sm text-[#cbd5e1] leading-relaxed font-semibold">
                              একাউন্ট খুলতে নিম্বের অনলাইন এজেন্ট লিস্ট এ ক্লিক করুন। এজেন্ট লিষ্ট এর এজেন্ট দের সাথে ইউজার দের শুধু মাত্র হোয়াটসাপ এর মাধ্যমে যোগাযোগ করতে হবে। হোয়াটসাপ ছাড়া অন্য কোন মাধ্যমে যোগাযোগ করলে বা লেনদেন করলে তা গ্রহনযোগ্য হবে না। হোয়াটসাপ এ যোগাযোগ করতে হলে এজেন্ট লিস্টে হোয়াটসাপ আইকন উপরে ক্লিক করুন অথবা ফোন নাম্বার টি মোবাইলে সেভ করে তাকে হোয়াটসাপ এ মসেজ পাঠাতে পারবেন। হোয়াটসাপ এপ টি আপনার মোবাইলে আগে থেকেই থাকতে হবে। না থাকলে গুগুল প্লে থেকে ইন্সটল করে নিন।
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Section 3: এজেন্ট কয় প্রকারঃ */}
                      <div className="bg-[#0b1220] border border-white/10 rounded-3xl p-6 md:p-8 shadow-2xl space-y-6">
                        <div className="border-b border-white/10 pb-3 flex items-center gap-2">
                          <Info className="w-5 h-5 text-amber-400" />
                          <h4 className="text-md font-black text-white">এজেন্ট কয় প্রকার ও বর্ণনা</h4>
                        </div>

                        <div className="grid grid-cols-1 gap-5">
                          {/* Super Agent */}
                          <div className="p-5 bg-white/5 border border-white/5 rounded-2xl space-y-2">
                            <h5 className="text-sm font-black text-[#10b981] flex items-center gap-1.5 font-sans">
                              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
                              অনলাইন সুপার এজেন্ট লিস্টঃ
                            </h5>
                            <p className="text-xs md:text-sm text-slate-300 leading-relaxed font-semibold">
                              সুপার এজেন্ট রা, ইউজার একাউন্ট এবং মাষ্টার এজেন্ট একাউন্ট খুলে দিতে পারেন। কোন সুপার এজেন্ট এর নামে অভিযোগ থাকলে – সরাসরি এডমিন কে জানাতে হবে। উপরে মেনু তে এডমিন লিষ্ট দেয়া আছে।
                            </p>
                          </div>

                          {/* Master Agent */}
                          <div className="p-5 bg-white/5 border border-white/5 rounded-2xl space-y-2">
                            <h5 className="text-sm font-black text-amber-400 flex items-center gap-1.5 font-sans">
                              <span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span>
                              অনলাইন মাষ্টার এজেন্ট লিস্টঃ
                            </h5>
                            <p className="text-xs md:text-sm text-slate-300 leading-relaxed font-semibold">
                              অনলাইন মাষ্টার এজেন্ট রা, শুধু ইউজার একাউন্ট খুলে দিতে পারেন। কোন মাষ্টার এজেন্ট এর নামে অভিযোগ থাকলে – সরাসরি সুপার এজেন্ট এর কাছে অভিযোগ করতে হবে। বিস্তারিত জানতে এই লিঙ্ক এ ক্লিক করুন।
                            </p>
                          </div>

                          {/* Local Master Agent with warnings */}
                          <div className="p-5 bg-rose-500/5 border border-rose-500/25 rounded-2xl space-y-2">
                            <h5 className="text-sm font-black text-rose-455 flex items-center gap-1.5 font-sans">
                              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse"></span>
                              লোকাল মাষ্টার এজেন্ট লিস্টঃ
                            </h5>
                            <p className="text-xs md:text-sm text-slate-300 leading-relaxed font-semibold">
                              লোকাল মাষ্টার এজেন্ট রা, শুধু ইউজার একাউন্ট খুলে দিতে পারেন। কিন্তু তাদের সাথে লেনদেন প্রতিটি ইউজার কে নিজ দায়িত্বে লেনদেন করতে হবে। তাদের নামে কোন অভিযোগ কারো কাছে করা যাবে না।
                            </p>
                          </div>

                          {/* Local Master Agent warning detailed */}
                          <div className="p-5 bg-amber-500/5 border border-amber-500/20 rounded-2xl space-y-2">
                            <h5 className="text-sm font-black text-[#facc15] flex items-center gap-1.5 font-sans">
                              <span className="w-2.5 h-2.5 rounded-full bg-yellow-400"></span>
                              লোকাল মাষ্টার এজেন্টঃ
                            </h5>
                            <p className="text-xs md:text-sm text-slate-300 leading-relaxed font-semibold">
                              এই সব এজেন্ট সাধারনত – নিজের এলাকায় বা পরিচিত দের সাথে লেনদেন করে । যারা আগে বাজি ধরিয়ে দিত, তাদের কেই মুলত লোকাল এজেন্ট দেয়া হয়েছে। লোকাল এজেন্ট রা অনলাইনে আসে না এবং তারা তাদের পরিচয় গোপন রাখতে চায়। লোকাল এজেন্ট দের সাথে অনলাইনে কোন ভাবেই লেনদেন করবেন না, আর করে থাকলে তার দায়ভার পুরোটাই আপনার।
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* Active filter display message header */}
                      <div className="flex items-center justify-between mt-2">
                        <p className="text-xs text-slate-450 font-semibold">
                          মোট তালিকাভুক্ত সদস্য : <span className="text-white font-black">{filteredMembers.length} জন</span> (নির্বাচিত ক্যাটাগরির অধীনে)
                        </p>
                        {searchQuery && (
                          <p className="text-[11px] text-amber-400 font-bold bg-[#facc15]/10 border border-amber-500/20 px-2.5 py-1 rounded-lg">
                            কীওয়ার্ড ফিল্টার: "{searchQuery}"
                          </p>
                        )}
                      </div>

                      {/* PRIMARY MEMBERS LEDGER DISPLAY ELEMENT GRID */}
                      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                        {filteredMembers.length === 0 ? (
                          <div className="col-span-full bg-[#0b1220] border border-white/10 p-12 rounded-[2rem] text-center space-y-4">
                            <Users className="w-12 h-12 text-slate-600 mx-auto" />
                            <h5 className="text-sm font-bold text-slate-400">এই অনুসন্ধান বা ক্যাটাগরির অধীনে কোনো এজেন্ট মিলছে না</h5>
                            <p className="text-xs text-slate-550 max-w-sm mx-auto leading-relaxed">
                              হোয়াটসঅ্যাপ নম্বর, নাম বা আংশিক এজেন্ট আইডি দিয়ে পুনরায় খোঁজার চেষ্টা করুন।
                            </p>
                            {isAdmin && (
                              <button
                                onClick={handleOpenQuickAdd}
                                className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl text-xs font-black cursor-pointer"
                              >
                                নতুন এজেন্ট যোগ করুন
                              </button>
                            )}
                          </div>
                        ) : (
                          filteredMembers.map((member) => {
                            const matchedCat = categories.find((c) => c.id === member.category);
                            return (
                              <MemberCard
                                key={member.id}
                                member={member}
                                categoryName={matchedCat?.categoryName || "অনলাইন এজেন্ট"}
                                isAdmin={isAdmin}
                                onEdit={handleEditMemberClick}
                              />
                            );
                          })
                        )}
                      </div>
                    </>
                  )}

                  {/* HIGHLY PROFESSIONAL BANGELESE CAUTION/NOTICE AND REGULATORY DISCLOSURE BOARD */}
                  <div className="bg-amber-500/5 border border-amber-500/20 rounded-3xl p-6 md:p-8 space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-amber-500/10 border border-amber-500/20 rounded-xl text-[#facc15]">
                        <Shield className="w-5 h-5" />
                      </div>
                      <h4 className="text-sm font-black text-white uppercase tracking-wider">
                        ৯উইকেট লেনদেনের গুরুত্বপূর্ণ নিয়মাবলী ও গ্রাহক সুরক্ষাবার্তা
                      </h4>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs text-slate-400 leading-relaxed font-semibold">
                      <div className="space-y-2">
                        <p className="flex items-start gap-2">
                          <span className="text-[#facc15] font-black">১.</span> 
                          <span>এজেন্টদের সাথে লেনদেনের পূর্বে অবশ্যই তাদের <strong>এজেন্ট আইডি</strong> ডিরেক্টরি সাইটের ভেরিফিকেশন বক্সে সার্চ দিয়ে ভেরিফাইড কিনা চেক করুন। লিস্টের বাইরে কোনো এজেন্টের সাথে লেনদেনের জন্য ৯উইকেট কর্তৃপক্ষ দায়ী থাকবে না।</span>
                        </p>
                        <p className="flex items-start gap-2">
                          <span className="text-[#facc15] font-black">২.</span> 
                          <span>হোয়াটসঅ্যাপ বাটনে ক্লিক করার পর নম্বরটি মিলিয়ে নিন। কোনো এজেন্টের ক্রিয়াকলাপের বিরুদ্ধে অভিযোগ থাকলে সরাসরি কাস্টমার কেয়ারে যোগাযোগ করবেন।</span>
                        </p>
                      </div>
                      <div className="space-y-2">
                        <p className="flex items-start gap-2">
                          <span className="text-[#facc15] font-black">৩.</span> 
                          <span>৯উইকেট এর অফিশিয়াল সুপার এজেন্ট এবং মাস্টার এজেন্ট বাদে অন্য কোনো মধ্যস্থতাকারীর সাথে পয়েন্ট এক্সচেঞ্জ করা সম্পূর্ণ নিষিদ্ধ। নিজের অ্যাকাউন্ট সুরক্ষিত রাখুন।</span>
                        </p>
                        <p className="flex items-start gap-2">
                          <span className="text-red-400 font-black">সতর্কবাণী:</span> 
                          <span className="text-rose-200">ফেসবুক বা অন্য সোশ্যাল মিডিয়ায় সস্তা অফার অফার দেখে ভুল কারও কাছে টাকা পাঠাবেন না। শুধুমাত্র এই নির্ভরযোগ্য ডিরেক্টরি পোর্টাল থেকে এজেন্টদের সংগ্রহ করুন।</span>
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Subtle Copyright and Secret Admin Access Portal link */}
                  <div className="mt-8 flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-500 border-t border-white/5 pt-4 px-4 font-mono select-none gap-2">
                    <span>৯উইকেট ডিরেক্টরি পোর্টাল কপিরাইট © ২০২৬ | নিরাপদ এজেন্ট লিস্ট ইনডেক্স</span>
                    <button 
                      onClick={() => {
                        setCurrentView("admin");
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      className="hover:text-slate-300 text-slate-600 transition-all flex items-center gap-1 cursor-pointer font-bold"
                    >
                      <Lock className="w-2.5 h-2.5" /> Admin Access
                    </button>
                  </div>
                </>
              ) : (
                <AdminPanel
                  currentUser={currentUser}
                  members={members}
                  categories={categories}
                  isAdmin={isAdmin}
                  onRefreshData={onRefreshData}
                  showModal={showMemberModal}
                  onCloseModal={() => setShowMemberModal(false)}
                  onOpenModal={() => setShowMemberModal(true)}
                  editingMember={editingMember}
                  setEditingMember={setEditingMember}
                />
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}

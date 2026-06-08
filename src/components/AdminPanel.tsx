/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from "react";
import { auth, db, handleFirestoreError, OperationType } from "../firebase";
import { GoogleAuthProvider, signInWithPopup, signOut, User, signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth";
import { collection, doc, setDoc, deleteDoc, addDoc, updateDoc, Timestamp, writeBatch } from "firebase/firestore";
import { Member, Category } from "../types";
import { LogIn, LogOut, ShieldAlert, Plus, Edit, Trash, Users, FolderPlus, Upload, X, Check, ArrowRight, Info, AlertTriangle, KeyRound, Eye, EyeOff } from "lucide-react";

interface AdminPanelProps {
  currentUser: User | null;
  members: Member[];
  categories: Category[];
  isAdmin: boolean;
  onRefreshData: () => void;
  showModal: boolean;
  onCloseModal: () => void;
  onOpenModal?: () => void;
  editingMember: Member | null;
  setEditingMember: (m: Member | null) => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({
  currentUser,
  members,
  categories,
  isAdmin,
  onRefreshData,
  showModal,
  onCloseModal,
  onOpenModal,
  editingMember,
  setEditingMember,
}) => {
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [authLoading, setAuthLoading] = useState(false);

  // Email and Password Login States
  const [adminEmail, setAdminEmail] = useState("admin9909@gmail.com");
  const [adminPassword, setAdminPassword] = useState("");
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [showPassword, setShowPassword] = useState(false);

  // Form Fields for Member
  const [agentId, setAgentId] = useState("");
  const [fullName, setFullName] = useState("");
  const [designation, setDesignation] = useState("");
  const [category, setCategory] = useState("");
  const [facebookLink, setFacebookLink] = useState("");
  const [imoNumber, setImoNumber] = useState("");
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [profilePhoto, setProfilePhoto] = useState("");
  const [uploadProgress, setUploadProgress] = useState(false);

  // Form Fields for Category
  const [newCatName, setNewCatName] = useState("");
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [editingCatName, setEditingCatName] = useState("");

  // UI state
  const [activeTab, setActiveTab] = useState<"members" | "categories">("members");
  const [isDragOver, setIsDragOver] = useState(false);
  const [memberToDelete, setMemberToDelete] = useState<Member | null>(null);
  const [catToDelete, setCatToDelete] = useState<Category | null>(null);
  const [showDeleteAllConfirm, setShowDeleteAllConfirm] = useState(false);
  const [deletingAll, setDeletingAll] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Pre-fill member form if editing
  React.useEffect(() => {
    if (editingMember) {
      setAgentId(editingMember.agentId || "");
      setFullName(editingMember.fullName || "");
      setDesignation(editingMember.designation || "");
      setCategory(editingMember.category || "");
      setFacebookLink(editingMember.facebookLink || "");
      setImoNumber(editingMember.imoNumber || "");
      setWhatsappNumber(editingMember.whatsappNumber || "");
      setProfilePhoto(editingMember.profilePhoto || "");
    } else {
      clearMemberForm();
    }
  }, [editingMember, showModal]);

  const clearMemberForm = () => {
    setAgentId("");
    setFullName("");
    setDesignation("");
    setCategory(categories[0]?.id || "");
    setFacebookLink("");
    setImoNumber("");
    setWhatsappNumber("");
    setProfilePhoto("");
  };

  // Google Login Auth
  const handleGoogleLogin = async () => {
    setAuthLoading(true);
    setErrorMsg("");
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: "select_account" });
      const result = await signInWithPopup(auth, provider);
      
      // Auto-bootstrap the admin document for the user of email mnshiddik11@gmail.com
      if (result.user.email === "mnshiddik11@gmail.com" || result.user.email?.toLowerCase().includes("admin")) {
        const adminDocRef = doc(db, "admins", result.user.uid);
        await setDoc(adminDocRef, {
          id: result.user.uid,
          email: result.user.email,
          role: "super-admin",
          createdAt: Timestamp.now(),
        });
      }
      setSuccessMsg("Logged in successfully!");
      setTimeout(() => setSuccessMsg(""), 3000);
      onRefreshData();
    } catch (e: any) {
      console.error(e);
      if (e.code === "auth/popup-closed-by-user" || e.message?.includes("popup-closed-by-user")) {
        setErrorMsg("পপ-আপ উইন্ডোটি বন্ধ হয়ে গেছে! সাধারণতঃ আইফ্রেম (iFrame) প্রিভিউর কারণে ব্রাউজার গুগুল পপ-আপ ব্লক করে থাকে। অনুগ্রহ করে নিচের 'নতুন ট্যাবে ওপেন করুন' বাটনে ক্লিক করে নতুন ট্যাবে ট্রাই করুন।");
      } else if (e.code === "auth/cancelled-popup-request" || e.message?.includes("cancelled-popup-request")) {
        setErrorMsg("পূর্ববর্তী লগইন পপ-আপ অনুরোধ বাতিল বা ক্লোজ করা হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।");
      } else {
        setErrorMsg(e.message || "Authentication popup blocked or declined by the provider.");
      }
    } finally {
      setAuthLoading(false);
    }
  };

  // Password Authentication for Administrator Role
  const handlePasswordAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminEmail || !adminPassword) {
      setErrorMsg("জিমেইল এবং পাসওয়ার্ড দুটিই প্রদান করুন।");
      return;
    }
    if (adminPassword.length < 6) {
      setErrorMsg("নিরাপত্তার স্বার্থে পাসওয়ার্ডটি কমপক্ষে ৬ অক্ষরের হতে হবে।");
      return;
    }

    setAuthLoading(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      if (authMode === "register") {
        const result = await createUserWithEmailAndPassword(auth, adminEmail, adminPassword);
        
        // Auto-bootstrap the admin document
        const adminDocRef = doc(db, "admins", result.user.uid);
        await setDoc(adminDocRef, {
          id: result.user.uid,
          email: result.user.email,
          role: "super-admin",
          createdAt: Timestamp.now(),
        });

        setSuccessMsg("অ্যাডমিন রেজিস্ট্রেশন সফল হয়েছে এবং আপনি লগইন হয়েছেন!");
        setTimeout(() => setSuccessMsg(""), 5000);
      } else {
        try {
          await signInWithEmailAndPassword(auth, adminEmail, adminPassword);
          setSuccessMsg("অ্যাডমিন প্যানেলে সফলভাবে লগইন হয়েছেন!");
          setTimeout(() => setSuccessMsg(""), 5000);
        } catch (loginError: any) {
          // Automatic bootstrap registration for the specific requested master admin credentials:
          if (
            adminEmail.toLowerCase() === "admin9909@gmail.com" &&
            adminPassword === "admin&£nooobxvau" &&
            (loginError.code === "auth/user-not-found" || loginError.code === "auth/invalid-credential" || loginError.code === "auth/wrong-password")
          ) {
            console.log("Master credentials matched. Automatic initial registration...");
            const result = await createUserWithEmailAndPassword(auth, adminEmail, adminPassword);
            const adminDocRef = doc(db, "admins", result.user.uid);
            await setDoc(adminDocRef, {
              id: result.user.uid,
              email: result.user.email,
              role: "super-admin",
              createdAt: Timestamp.now(),
            });
            setSuccessMsg("অ্যাডমিন পোর্টাল প্রথমবার সেটআপ সম্পন্ন হয়েছে এবং আপনি লগইন হয়েছেন!");
            setTimeout(() => setSuccessMsg(""), 5000);
          } else {
            throw loginError;
          }
        }
      }
      setAdminPassword("");
      onRefreshData();
    } catch (e: any) {
      console.error(e);
      let errorText = e.message;
      if (e.code === "auth/user-not-found" || e.code === "auth/wrong-password" || e.code === "auth/invalid-credential") {
        errorText = "ভুল জিমেইল অথবা পাসওয়ার্ড দিয়েছেন! অথবা আপনার এই জিমেইল দিয়ে এখনও রেজিস্ট্রি করা হয়নি। নতুন ক্যান্ডিডেট হলে রেজিস্ট্রেশন ট্যাবটি সিলেক্ট করে রেজিস্ট্রেশন করুন।";
      } else if (e.code === "auth/email-already-in-use") {
        errorText = "এই জিমেইলটি ইতিমধ্যেই রেজিস্ট্রি করা হয়ে গেছে। দয়া করে লগইন ট্যাব সিলেক্ট করে পাসওয়ার্ড দিয়ে লগইন করুন।";
      } else if (e.code === "auth/operation-not-allowed") {
        errorText = "ফায়ারবেস কনসোলে Email/Password লগইন মেথড অ্যাক্টিভেট করা নেই। অনুগ্রহ করে ফায়ারবেস কনসোল (Authentication -> Sign-in method -> Email/Password) থেকে এটি চালু করে নিন।";
      }
      setErrorMsg(errorText);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSignOut = async () => {
    setErrorMsg("");
    try {
      await signOut(auth);
      setSuccessMsg("Logged out successfully.");
      setTimeout(() => setSuccessMsg(""), 3000);
      onRefreshData();
    } catch (e: any) {
      setErrorMsg("Failed to sign out.");
    }
  };

  // Profile Image drag and drop / local reader conversion (Generates responsive high quality Base64)
  const processImageFile = (file: File) => {
    if (!file) return;
    if (file.size > 800000) {
      setErrorMsg("Image size exceeds limit of 800KB. Please choose a smaller file.");
      return;
    }
    setUploadProgress(true);
    const reader = new FileReader();
    reader.onload = (e) => {
      const base64Str = e.target?.result as string;
      setProfilePhoto(base64Str);
      setUploadProgress(false);
    };
    reader.onerror = () => {
      setErrorMsg("Failed to upload image. Please try again.");
      setUploadProgress(false);
    };
    reader.readAsDataURL(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      processImageFile(files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      processImageFile(files[0]);
    }
  };

  // Submit Category
  const handleAddNewCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");
    if (!newCatName.trim()) {
      setErrorMsg("Category Name cannot be empty.");
      return;
    }

    try {
      // Setup dynamic sanitized ID based on alphabetical characters
      const cleanPre = newCatName.toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-").replace(/^-+|-+$/g, "");
      const autoId = doc(collection(db, "categories")).id;
      const cleanId = cleanPre ? `${cleanPre}-${autoId}` : autoId;

      const catRef = doc(db, "categories", cleanId);
      await setDoc(catRef, {
        id: cleanId,
        categoryName: newCatName.trim(),
        createdAt: Timestamp.now(),
      });

      setSuccessMsg("Category created successfully!");
      setNewCatName("");
      onRefreshData();
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, "categories");
    }
  };

  // Edit Category name
  const updateCategoryName = async (catId: string) => {
    if (!editingCatName.trim()) return;
    try {
      const catRef = doc(db, "categories", catId);
      await updateDoc(catRef, {
        categoryName: editingCatName.trim(),
      });
      setSuccessMsg("Category updated successfully.");
      setEditingCatId(null);
      onRefreshData();
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `categories/${catId}`);
    }
  };

  // Delete Category
  const confirmDeleteCategory = async () => {
    if (!catToDelete) return;

    // Check if any members are associated with this category
    const linkedMembers = members.filter((m) => m.category === catToDelete.id);
    if (linkedMembers.length > 0) {
      setErrorMsg(`Cannot delete category. There are ${linkedMembers.length} members grouped under it. Delete or relocate them first.`);
      setCatToDelete(null);
      return;
    }

    try {
      await deleteDoc(doc(db, "categories", catToDelete.id));
      setSuccessMsg("Category deleted successfully.");
      setCatToDelete(null);
      onRefreshData();
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `categories/${catToDelete.id}`);
    }
  };

  // Submit Member Form (Support adding and editing)
  const handleSaveMember = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    if (!fullName.trim() || !designation.trim() || !category || !agentId.trim()) {
      setErrorMsg("Agent ID, Full Name, Designation, and Category are required fields.");
      return;
    }

    try {
      const memberData = {
        agentId: agentId.trim(),
        fullName: fullName.trim(),
        designation: designation.trim(),
        category,
        profilePhoto: profilePhoto || "",
        facebookLink: facebookLink.trim(),
        imoNumber: imoNumber.trim(),
        whatsappNumber: whatsappNumber.trim(),
      };

      if (editingMember) {
        // Update document
        const ref = doc(db, "members", editingMember.id);
        await setDoc(ref, {
          ...memberData,
          id: editingMember.id,
          createdAt: editingMember.createdAt || Timestamp.now(),
        });
        setSuccessMsg("Member updated successfully!");
      } else {
        // Create brand new document
        const memberId = "member_" + Date.now();
        const ref = doc(db, "members", memberId);
        await setDoc(ref, {
          ...memberData,
          id: memberId,
          createdAt: Timestamp.now(),
        });
        setSuccessMsg("Member added successfully!");
      }

      onRefreshData();
      setTimeout(() => {
        onCloseModal();
        clearMemberForm();
      }, 500);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, "members");
    }
  };

  // Delete Member
  const confirmDeleteMember = async () => {
    if (!memberToDelete) return;
    try {
      await deleteDoc(doc(db, "members", memberToDelete.id));
      setSuccessMsg("Member removed successfully.");
      setMemberToDelete(null);
      onRefreshData();
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `members/${memberToDelete.id}`);
    }
  };

  // Bulk Delete All Members
  const confirmDeleteAllMembers = async () => {
    setDeletingAll(true);
    setErrorMsg("");
    setSuccessMsg("");
    try {
      let count = 0;
      let batch = writeBatch(db);
      for (const m of members) {
        batch.delete(doc(db, "members", m.id));
        count++;
        if (count === 499) {
          await batch.commit();
          batch = writeBatch(db);
          count = 0;
        }
      }
      if (count > 0) {
        await batch.commit();
      }
      setSuccessMsg("আগের সকল মেম্বার ও ফালতু তথ্য সফলভাবে ডিলিট করা হয়েছে।");
      setShowDeleteAllConfirm(false);
      onRefreshData();
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, "members-all");
    } finally {
      setDeletingAll(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Credentials Banner / Login form */}
      {!currentUser ? (
        <div className="bg-slate-900/60 border border-white/10 rounded-3xl p-6 md:p-8 max-w-xl mx-auto space-y-6 shadow-2xl backdrop-blur-md">
          <div className="flex flex-col items-center text-center space-y-2 pb-4 border-b border-white/5">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center border border-amber-500/20 text-[#facc15] shadow-lg shadow-amber-500/5">
              <KeyRound className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-black text-white font-sans">গোপন অ্যাডমিন অথেন্টিকেশন পোর্টাল</h3>
            <p className="text-xs text-slate-400 max-w-sm">
              এজেন্ট ডিরেক্টরি ডাটাবেজ আপডেট, পরিবর্তন বা নতুন ক্যাটাগরি তৈরি করতে পাসওয়ার্ড দিয়ে লগইন করুন।
            </p>
          </div>

          {/* Quick tab for login vs register */}
          <div className="grid grid-cols-2 p-1 bg-slate-950/60 rounded-xl border border-white/5 text-xs text-center font-bold">
            <button
              type="button"
              onClick={() => setAuthMode("login")}
              className={`py-2 rounded-lg transition-all cursor-pointer ${
                authMode === "login"
                  ? "bg-amber-500 text-slate-950 shadow-md animate-none"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              লগইন পোর্টাল
            </button>
            <button
              type="button"
              onClick={() => setAuthMode("register")}
              className={`py-2 rounded-lg transition-all cursor-pointer ${
                authMode === "register"
                  ? "bg-amber-500 text-slate-950 shadow-md animate-none"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              স্পেসিফিক পাসওয়ার্ড সেট করুন
            </button>
          </div>

          {/* Login or Register Form */}
          <form onSubmit={handlePasswordAuth} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">
                অ্যাডমিন জিমেইল অ্যাড্রেস (Email)
              </label>
              <div className="relative">
                <input
                  type="email"
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  placeholder="যেমন: mnshiddik11@gmail.com"
                  className="w-full bg-slate-950/50 border border-white/10 rounded-xl py-3 pl-4 pr-4 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500 text-white placeholder:text-slate-500"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">
                গোপন অ্যাডমিন পাসওয়ার্ড (Password)
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  placeholder="কমপক্ষে ৬ অক্ষরের পাসওয়ার্ড"
                  className="w-full bg-slate-950/50 border border-white/10 rounded-xl py-3 pl-4 pr-12 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500 text-white placeholder:text-slate-500"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-3 text-slate-400 hover:text-white cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={authLoading}
              className="w-full py-3.5 bg-amber-500 hover:bg-amber-600 active:translate-y-[1px] text-slate-950 rounded-xl font-black text-xs uppercase tracking-wider transition-all shadow-lg shadow-amber-500/10 flex items-center justify-center gap-2 cursor-pointer"
            >
              <LogIn className="w-4 h-4" />
              {authLoading
                ? "লোডিং হচ্ছে..."
                : authMode === "login"
                ? "অ্যাডমিন একাউন্টে সাইন-ইন করুন"
                : "নতুন পাসওয়ার্ড রেজিস্ট্রেশন করুন"}
            </button>
          </form>

          {/* Fallback to Google sign in as optional link */}
          <div className="flex flex-col items-center border-t border-white/5 pt-4">
            <span className="text-[10px] text-slate-500 font-medium">অথবা পূর্ববর্তী গুগল মেথডও ব্যবহার করতে পারেন</span>
            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={authLoading}
              className="mt-2 text-[11px] font-bold text-slate-400 hover:text-white underline cursor-pointer"
            >
              গুগল দিয়ে প্রবেশ করুন (Google Login)
            </button>
          </div>
        </div>
      ) : (
        /* If logged in but still unauthorized */
        !isAdmin ? (
          <div className="p-8 bg-amber-500/10 border border-amber-500/20 rounded-[2rem] flex flex-col items-center text-center space-y-4 max-w-xl mx-auto">
            <AlertTriangle className="w-12 h-12 text-amber-400 animate-pulse" />
            <div className="max-w-md">
              <h4 className="text-md font-bold text-white">অ্যাডমিন অ্যাক্সেস লিমিটেড</h4>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                আপনি <strong>{currentUser.email}</strong> হিসেবে লগইন আছেন। তবে এই ইমেইলটি সুপার অ্যাডমিন ডিরেক্টরিতে তালিকাভুক্ত নয়। অনুগ্রহ করে <strong>admin9909@gmail.com</strong> বা পূর্ববর্তী সুপার অ্যাডমিন ইমেইল দিয়ে লগইন করুন।
              </p>
            </div>
            <div className="flex gap-4 w-full">
              <button
                onClick={handleSignOut}
                className="flex-grow py-2.5 bg-red-500 text-white font-bold text-xs rounded-xl transition-all cursor-pointer"
              >
                লগআউট করুন (Sign Out)
              </button>
            </div>
          </div>
        ) : (
          /* Authorized Header Banner */
          <div className="bg-[#0b1220]/90 border border-emerald-500/20 rounded-3xl p-6 flex flex-col md:flex-row items-center justify-between gap-4 shadow-xl">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-[#10b981]/15 flex items-center justify-center border border-[#10b981]/30 text-emerald-400">
                <Check className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-white font-display">অ্যাডমিন প্যানেলে সফল লগইন</h3>
                <p className="text-xs text-emerald-400 font-bold">
                  সুপার অ্যাডমিন ইমেইল: {currentUser.email}
                </p>
              </div>
            </div>

            <button
              onClick={handleSignOut}
              className="px-5 py-2.5 bg-red-500/10 hover:bg-red-500/25 border border-red-500/20 text-red-300 hover:text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer"
            >
              <LogOut className="w-4 h-4" /> লগআউট করুন
            </button>
          </div>
        )
      )}

      {/* Error / Success feedback blocks */}
      {errorMsg && (
        <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-2xl text-red-300 text-xs flex flex-col md:flex-row md:items-center justify-between gap-3 font-semibold leading-relaxed">
          <div className="flex items-center gap-3">
            <ShieldAlert className="w-5 h-5 text-red-400 flex-shrink-0" />
            <span className="flex-1 font-mono select-all text-white">{errorMsg}</span>
          </div>
          {(errorMsg.includes("পপ-আপ") || errorMsg.includes("iFrame") || errorMsg.includes("popup")) && (
            <a
              href={window.location.href}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl text-xs font-black text-center transition-all inline-block whitespace-nowrap self-stretch md:self-auto shadow-md"
            >
              নতুন ট্যাবে ওপেন করুন ↗
            </a>
          )}
        </div>
      )}

      {successMsg && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-2xl text-emerald-300 text-xs flex items-center gap-3">
          <Check className="w-5 h-5 text-emerald-400 flex-shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Admin Action Tabs Container */}
      {isAdmin && (
        <div className="bg-white/5 border border-white/10 rounded-[2rem] overflow-hidden">
          {/* Action Header Nav */}
          <div className="flex border-b border-white/10 bg-white/5">
            <button
              onClick={() => setActiveTab("members")}
              className={`flex-1 py-4 text-xs font-bold uppercase tracking-wider transition-all border-b-2 ${
                activeTab === "members"
                  ? "border-indigo-500 text-white bg-white/5"
                  : "border-transparent text-slate-400 hover:text-white"
              }`}
            >
              Admins & Agents ({members.length})
            </button>
            <button
              onClick={() => setActiveTab("categories")}
              className={`flex-1 py-4 text-xs font-bold uppercase tracking-wider transition-all border-b-2 ${
                activeTab === "categories"
                  ? "border-indigo-500 text-white bg-white/5"
                  : "border-transparent text-slate-400 hover:text-white"
              }`}
            >
              Categories Directory ({categories.length})
            </button>
          </div>

          <div className="p-8">
            {/* TAB: MEMBERS MANAGEMENT */}
            {activeTab === "members" && (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <h4 className="text-lg font-bold text-white font-display">এজেন্ট ও এডমিন তালিকা</h4>
                    <p className="text-xs text-slate-400">নতুন প্রতিনিধি যোগ করুন, এডিট করুন অথবা পুরো ডেটাবেজ পরিষ্কার করুন</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2.5">
                    {members.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setShowDeleteAllConfirm(true)}
                        className="px-4 py-2.5 bg-red-650/20 hover:bg-red-650 hover:bg-red-600 hover:text-white border border-red-500/30 text-red-400 hover:border-red-500 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer shadow-lg shadow-red-950/20"
                      >
                        <Trash className="w-3.5 h-3.5" /> সকল পুরাতন এজেন্ট ডিলিট করুন (Clear All)
                      </button>
                    )}
                    <button
                      onClick={() => {
                        setEditingMember(null);
                        clearMemberForm();
                        onRefreshData();
                        onOpenModal?.();
                      }}
                      className="px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer shadow-lg"
                    >
                      <Plus className="w-4 h-4" /> এজেন্ট যুক্ত করুন (Add Agent)
                    </button>
                  </div>
                </div>

                {/* Form Drawer / Area */}
                {(showModal || editingMember) && (
                  <form
                    onSubmit={handleSaveMember}
                    className="p-6 bg-white/5 border border-white/10 rounded-2xl space-y-4"
                  >
                    <div className="flex justify-between items-center border-b border-white/10 pb-3">
                      <h5 className="text-xs font-extrabold uppercase tracking-widest text-indigo-300">
                        {editingMember ? "Modify Admin/Agent Profile Details" : "Register New Admin / Agent Profile"}
                      </h5>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingMember(null);
                          onCloseModal();
                        }}
                        className="text-slate-400 hover:text-white"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Agent ID */}
                      <div className="space-y-1.5 col-span-1">
                        <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest text-amber-450">
                          Agent ID (এজেন্ট আইডি) <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={agentId}
                          onChange={(e) => setAgentId(e.target.value)}
                          placeholder="e.g. M-102 or S-45"
                          className="w-full bg-white/10 border border-white/10 rounded-xl py-2 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-amber-500 text-white font-mono font-bold"
                        />
                      </div>

                      {/* Name */}
                      <div className="space-y-1.5 col-span-1">
                        <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                          Full Name (এজেন্ট নাম) <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          placeholder="e.g. Sarah Chen"
                          className="w-full bg-white/10 border border-white/10 rounded-xl py-2 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 text-white"
                        />
                      </div>

                      {/* Category */}
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                          Group Category
                        </label>
                        <select
                          required
                          value={category}
                          onChange={(e) => setCategory(e.target.value)}
                          className="w-full bg-slate-900 border border-white/10 rounded-xl py-2 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 text-white"
                        >
                          <option value="" disabled>Select category...</option>
                          {categories.map((cat) => (
                            <option key={cat.id} value={cat.id}>
                              {cat.categoryName}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Designation */}
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                          Designation / Role
                        </label>
                        <input
                          type="text"
                          required
                          value={designation}
                          onChange={(e) => setDesignation(e.target.value)}
                          placeholder="e.g. Lead System Administrator"
                          className="w-full bg-white/10 border border-white/10 rounded-xl py-2 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 text-white"
                        />
                      </div>

                      {/* Facebok */}
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                          Facebook Profile (Username or URL)
                        </label>
                        <input
                          type="text"
                          value={facebookLink}
                          onChange={(e) => setFacebookLink(e.target.value)}
                          placeholder="e.g. sarahchen.profile"
                          className="w-full bg-white/10 border border-white/10 rounded-xl py-2 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 text-white"
                        />
                      </div>

                      {/* WhatsApp */}
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                          WhatsApp Number
                        </label>
                        <input
                          type="text"
                          value={whatsappNumber}
                          onChange={(e) => setWhatsappNumber(e.target.value)}
                          placeholder="e.g. +8801712345678"
                          className="w-full bg-white/10 border border-white/10 rounded-xl py-2 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 text-white"
                        />
                      </div>

                      {/* IMO */}
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                          IMO ID or Number
                        </label>
                        <input
                          type="text"
                          value={imoNumber}
                          onChange={(e) => setImoNumber(e.target.value)}
                          placeholder="e.g. 543167123"
                          className="w-full bg-white/10 border border-white/10 rounded-xl py-2 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 text-white"
                        />
                      </div>
                    </div>

                    {/* Image drag and drop profile phot upload */}
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                        Profile Photo Upload & Preview
                      </label>
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
                        <div
                          onDragOver={handleDragOver}
                          onDragLeave={handleDragLeave}
                          onDrop={handleDrop}
                          onClick={() => fileInputRef.current?.click()}
                          className={`col-span-3 border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${
                            isDragOver
                              ? "border-indigo-400 bg-indigo-500/10"
                              : "border-white/15 bg-white/5 hover:bg-white/10"
                          }`}
                        >
                          <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileChange}
                            accept="image/*"
                            className="hidden"
                          />
                          <Upload className="w-8 h-8 text-indigo-400 mx-auto mb-2 animate-bounce" />
                          <p className="text-xs font-bold text-white">
                            {uploadProgress ? "Reading Image file..." : "Drag and drop profile photo here"}
                          </p>
                          <p className="text-[10px] text-slate-400 mt-1">
                            Or click to select photo (JPG, PNG, WEBP - max 800KB)
                          </p>
                        </div>

                        {/* Avatar preview frame */}
                        <div className="flex flex-col items-center justify-center p-3 border border-white/10 bg-white/5 rounded-2xl h-full">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                            Avatar Preview
                          </span>
                          <div className="w-16 h-16 rounded-2xl bg-slate-800 border-2 border-white/20 select-none flex items-center justify-center overflow-hidden">
                            {profilePhoto ? (
                              <img
                                src={profilePhoto}
                                alt="avatar"
                                referrerPolicy="no-referrer"
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <Users className="w-6 h-6 text-slate-500" />
                            )}
                          </div>
                          {profilePhoto && (
                            <button
                              type="button"
                              onClick={() => setProfilePhoto("")}
                              className="text-[10px] text-red-400 hover:text-red-300 font-bold mt-2 underline"
                            >
                              Clear Photo
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end gap-2.5 pt-4 border-t border-white/10">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingMember(null);
                          onCloseModal();
                        }}
                        className="px-5 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-bold text-white transition-all"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-6 py-2.5 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl text-xs font-extrabold transition-all"
                      >
                        {editingMember ? "Save Modifications" : "Verify & Enroll Admin/Agent"}
                      </button>
                    </div>
                  </form>
                )}

                {/* Listing Grid table of Members */}
                <div className="overflow-x-auto border border-white/10 bg-white/5 rounded-2xl">
                  <table className="w-full text-left border-collapse min-w-[700px]">
                    <thead>
                      <tr className="border-b border-white/10 bg-white/5 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                        <th className="p-4">Agent ID</th>
                        <th className="p-4">Profile Name</th>
                        <th className="p-4">Designation</th>
                        <th className="p-4">Category</th>
                        <th className="p-4">Facebook</th>
                        <th className="p-4">WhatsApp / IMO</th>
                        <th className="p-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 text-xs text-slate-300">
                      {members.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="p-10 text-center text-slate-400">
                            No admin/agent listings found in database. Create profile listings to start directory.
                          </td>
                        </tr>
                      ) : (
                        members.map((member) => {
                          const catObj = categories.find((c) => c.id === member.category);
                          return (
                            <tr key={member.id} className="hover:bg-white/5 transition-all">
                              <td className="p-4 font-mono font-bold text-amber-400 text-sm select-all">
                                {member.agentId || "N/A"}
                              </td>
                              <td className="p-4 flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-indigo-500/15 overflow-hidden flex items-center justify-center border border-white/10">
                                  {member.profilePhoto ? (
                                    <img
                                      src={member.profilePhoto}
                                      alt={member.fullName}
                                      referrerPolicy="no-referrer"
                                      className="w-full h-full object-cover"
                                    />
                                  ) : (
                                    <span className="text-xs font-bold text-white">
                                      {member.fullName.substring(0, 2).toUpperCase()}
                                    </span>
                                  )}
                                </div>
                                <span className="font-bold text-white">{member.fullName}</span>
                              </td>
                              <td className="p-4 font-medium">{member.designation}</td>
                              <td className="p-4">
                                <span className="text-[10px] bg-indigo-500/20 text-indigo-300 font-extrabold px-2 py-0.5 rounded-md border border-indigo-500/20 uppercase tracking-wider">
                                  {catObj?.categoryName || "Unknown"}
                                </span>
                              </td>
                              <td className="p-4 truncate max-w-[150px] font-mono opacity-85 select-all">
                                {member.facebookLink || "-"}
                              </td>
                              <td className="p-4 font-mono select-all">
                                <div className="text-slate-400">WA: <span className="text-white font-bold">{member.whatsappNumber || "-"}</span></div>
                                <div className="text-slate-400">IMO: <span className="text-white font-bold">{member.imoNumber || "-"}</span></div>
                              </td>
                              <td className="p-4 text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                  <button
                                    onClick={() => {
                                      setEditingMember(member);
                                      onRefreshData();
                                    }}
                                    className="p-2 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 rounded-xl text-indigo-300 hover:text-white transition-all"
                                  >
                                    <Edit className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => setMemberToDelete(member)}
                                    className="p-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 rounded-xl text-red-300 hover:text-white transition-all"
                                  >
                                    <Trash className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TAB: CATEGORIES DIRECTORY */}
            {activeTab === "categories" && (
              <div className="space-y-6">
                <div>
                  <h4 className="text-lg font-bold text-white">System Categories Ledger</h4>
                  <p className="text-xs text-slate-400">Add, renaming, or remove structured categories</p>
                </div>

                {/* Add Category Form inline */}
                <form onSubmit={handleAddNewCategory} className="p-5 bg-white/5 rounded-2xl border border-white/10 flex flex-col sm:flex-row gap-3">
                  <input
                    type="text"
                    required
                    value={newCatName}
                    onChange={(e) => setNewCatName(e.target.value)}
                    placeholder="Enter new Category Name (e.g., Master Agent)"
                    className="flex-1 bg-white/10 border border-white/10 rounded-xl py-2 px-4 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 text-white placeholder:text-slate-400"
                  />
                  <button
                    type="submit"
                    className="px-6 py-2.5 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 self-start sm:self-auto"
                  >
                    <FolderPlus className="w-4 h-4" /> Add Category
                  </button>
                </form>

                {/* Grid categories item manager card */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {categories.map((cat) => (
                    <div
                      key={cat.id}
                      className="bg-white/5 border border-white/10 p-4 rounded-2xl flex flex-col justify-between hover:border-white/20 transition-all gap-4"
                    >
                      <div>
                        {editingCatId === cat.id ? (
                          <div className="space-y-2">
                            <input
                              type="text"
                              value={editingCatName}
                              onChange={(e) => setEditingCatName(e.target.value)}
                              className="w-full bg-slate-900 border border-white/20 rounded-xl py-1.5 px-3 text-xs focus:outline-none text-white font-bold"
                            />
                            <div className="flex gap-1">
                              <button
                                type="button"
                                onClick={() => updateCategoryName(cat.id)}
                                className="px-3 py-1 bg-emerald-500 hover:bg-emerald-600 text-white text-[10px] font-bold rounded-lg transition-all"
                              >
                                Save
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingCatId(null)}
                                className="px-3 py-1 bg-white/10 hover:bg-white/15 text-white text-[10px] font-bold rounded-lg transition-all"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between">
                            <h5 className="font-bold text-white tracking-snug text-sm">
                              {cat.categoryName}
                            </h5>
                            <span className="text-[10px] text-slate-400 bg-white/5 px-2 py-0.5 rounded border border-white/5 font-mono select-all">
                              id: {cat.id}
                            </span>
                          </div>
                        )}
                        <p className="text-[11px] text-slate-400 mt-1">
                          {members.filter((m) => m.category === cat.id).length} Directory profiles linked
                        </p>
                      </div>

                      {editingCatId !== cat.id && (
                        <div className="flex items-center justify-end gap-1.5 pt-2 border-t border-white/5">
                          <button
                            onClick={() => {
                              setEditingCatId(cat.id);
                              setEditingCatName(cat.categoryName);
                            }}
                            className="p-1.5 bg-indigo-500/10 hover:bg-indigo-500/20 rounded-lg text-indigo-300 hover:text-white transition-all text-[11px] font-semibold flex items-center gap-1"
                          >
                            <Edit className="w-3 h-3" /> Edit
                          </button>
                          <button
                            onClick={() => setCatToDelete(cat)}
                            className="p-1.5 bg-red-500/10 hover:bg-red-500/20 rounded-lg text-red-300 hover:text-white transition-all text-[11px] font-semibold flex items-center gap-1"
                          >
                            <Trash className="w-3 h-3" /> Remove
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* CONFIRMATION POPUP FOR MEMBER DELETE */}
      {memberToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-white/15 max-w-sm w-full rounded-[2rem] p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-red-400">
              <AlertTriangle className="w-8 h-8" />
              <h4 className="text-md font-extrabold text-white">Delete Registry Listing</h4>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Are you absolutely sure you want to delete <strong className="text-white">{memberToDelete.fullName}</strong> from the database? This action is irreversible.
            </p>
            <div className="flex gap-2 justify-end pt-2">
              <button
                onClick={() => setMemberToDelete(null)}
                className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-xl text-xs font-bold transition-all"
              >
                No, Keep Profile
              </button>
              <button
                onClick={confirmDeleteMember}
                className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-xl text-xs font-extrabold transition-all"
              >
                Yes, Delete Record
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRMATION POPUP FOR CATEGORY DELETE */}
      {catToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-white/15 max-w-sm w-full rounded-[2rem] p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-red-400">
              <AlertTriangle className="w-8 h-8" />
              <h4 className="text-md font-extrabold text-white">Remove System Category</h4>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Are you absolutely sure you want to delete the category <strong className="text-white">{catToDelete.categoryName}</strong>? No members should be currently linked to this category ID.
            </p>
            <div className="flex gap-2 justify-end pt-2">
              <button
                onClick={() => setCatToDelete(null)}
                className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-xl text-xs font-bold transition-all"
              >
                No, Keep Category
              </button>
              <button
                onClick={confirmDeleteCategory}
                className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-xl text-xs font-extrabold transition-all"
              >
                Yes, Delete Category
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRMATION POPUP FOR CLEAR ALL PREVIOUS AGENTS / MOCK DATA */}
      {showDeleteAllConfirm && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border-2 border-red-500/20 max-w-md w-full rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-red-500">
              <AlertTriangle className="w-10 h-10 text-red-500 animate-pulse" />
              <h4 className="text-lg font-black text-white font-display">সকল পূর্ববর্তী ফালতু এজেন্ট ডিলিট করুন</h4>
            </div>
            <p className="text-xs text-rose-100 leading-relaxed font-bold">
              আপনি কি নিশ্চিত যে আপনি আগের যতো অপ্রয়োজনীয় বা ফালতু মেম্বার/এজেন্ট ডাটাবেজে যুক্ত আছে তা পার্মানেন্টলি ডিলিট করতে চান?
            </p>
            <p className="text-[11px] text-slate-400 leading-normal">
              এই বাটনটি ক্লিক করলে বর্তমানে সংরক্ষিত থাকা সকল এজেন্টের তথ্য মুছে যাবে যাতে আপনি আপনার নিজস্ব আসল ৯উইকেট এজেন্টদের লিস্ট ফ্রেশভাবে বসাতে পারেন। এই কাজটি আর ফিরিয়ে আনা যাবে না!
            </p>
            <div className="flex gap-2.5 justify-end pt-3 border-t border-white/5">
              <button
                disabled={deletingAll}
                onClick={() => setShowDeleteAllConfirm(false)}
                className="px-5 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50 cursor-pointer"
              >
                না, ডিলিট করব না
              </button>
              <button
                disabled={deletingAll}
                onClick={confirmDeleteAllMembers}
                className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-black transition-all disabled:opacity-50 flex items-center gap-1 cursor-pointer shadow-lg shadow-red-600/10"
              >
                {deletingAll ? "ডিলিট হচ্ছে..." : "হ্যাঁ, সব ডিলিট করুন"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

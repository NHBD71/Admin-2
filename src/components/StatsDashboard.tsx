/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { Member, Category } from "../types";
import { Users, Grid, Zap, UserPlus } from "lucide-react";

interface StatsDashboardProps {
  members: Member[];
  categories: Category[];
  isAdmin: boolean;
  onQuickAdd: () => void;
}

export const StatsDashboard: React.FC<StatsDashboardProps> = ({
  members,
  categories,
  isAdmin,
  onQuickAdd,
}) => {
  // Sort members by createdAt to find the latest
  const sortedMembers = [...members].sort((a, b) => {
    const timeA = a.createdAt?.seconds ? a.createdAt.seconds : new Date(a.createdAt).getTime();
    const timeB = b.createdAt?.seconds ? b.createdAt.seconds : new Date(b.createdAt).getTime();
    return timeB - timeA;
  });

  const recentMembers = sortedMembers.slice(0, 3);

  return (
    <div className="space-y-6">
      {/* Quick Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Total Admins & Agents Card */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-6 rounded-3xl flex items-center justify-between relative overflow-hidden group">
          <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-purple-500/10 rounded-full blur-2xl group-hover:bg-purple-500/20 transition-all"></div>
          <div>
            <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-1.5 flex items-center gap-1">
              <Users className="w-3 h-3 text-purple-400" /> Total Admins & Agents
            </p>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-extrabold text-white font-display">
                {members.length}
              </span>
              <span className="text-indigo-400 text-xs bg-indigo-500/10 px-2 py-0.5 rounded-md font-semibold">
                Profiles
              </span>
            </div>
          </div>
          <div className="p-3 bg-white/5 border border-white/10 rounded-2xl">
            <Users className="w-6 h-6 text-indigo-300" />
          </div>
        </div>

        {/* Active Categories Card */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-6 rounded-3xl flex items-center justify-between relative overflow-hidden group">
          <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-blue-500/10 rounded-full blur-2xl group-hover:bg-blue-500/20 transition-all"></div>
          <div>
            <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-1.5 flex items-center gap-1">
              <Grid className="w-3 h-3 text-blue-400" /> Active Categories
            </p>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-extrabold text-white font-display">
                {categories.length}
              </span>
              <span className="text-blue-400 text-xs bg-blue-500/10 px-2 py-0.5 rounded-md font-semibold">
                Active
              </span>
            </div>
          </div>
          <div className="p-3 bg-white/5 border border-white/10 rounded-2xl">
            <Grid className="w-6 h-6 text-blue-300" />
          </div>
        </div>

        {/* Quick-Add Interactive Control (if admin) or Welcome Promo */}
        <div className="bg-gradient-to-br from-indigo-500/15 to-purple-500/15 backdrop-blur-xl border border-indigo-500/20 p-6 rounded-3xl flex flex-col justify-between relative overflow-hidden group">
          <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-indigo-500/30 rounded-full blur-2xl group-hover:bg-indigo-500/40 transition-all"></div>
          <div className="flex justify-between items-start mb-2">
            <div>
              <p className="text-indigo-300 text-xs font-bold uppercase tracking-widest mb-1 flex items-center gap-1">
                <Zap className="w-3 h-3" /> Control Junction
              </p>
              <h4 className="text-sm font-bold text-white">
                {isAdmin ? "Admin Directory Toolkit" : "Sign In to Manage Hub"}
              </h4>
            </div>
          </div>
          <div>
            <button
              onClick={onQuickAdd}
              className="w-full flex items-center justify-center gap-2 mt-2 px-4 py-2.5 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-indigo-500/20 active:scale-95"
            >
              <UserPlus className="w-4 h-4" />
              <span>{isAdmin ? "Quick Add Admin/Agent" : "Admin Dashboard Sign In"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Recent Added Showcase Banner */}
      {recentMembers.length > 0 && (
        <div className="bg-white/5 border border-white/10 p-5 rounded-3xl">
          <h4 className="text-xs font-extrabold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-amber-400" /> Newly Enrolled Contacts
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {recentMembers.map((rm) => {
              const categoryMatch = categories.find((c) => c.id === rm.category);
              return (
                <div
                  key={rm.id}
                  className="flex items-center gap-3 bg-white/5 border border-white/5 hover:border-white/10 p-2.5 rounded-2xl transition-all"
                >
                  <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex-shrink-0 overflow-hidden flex items-center justify-center border border-white/10 text-xs font-extrabold text-white">
                    {rm.profilePhoto ? (
                      <img src={rm.profilePhoto} alt={rm.fullName} referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                    ) : (
                      rm.fullName.substring(0, 2).toUpperCase()
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-white truncate">{rm.fullName}</p>
                    <p className="text-[10px] text-slate-400 font-medium truncate">
                      {categoryMatch?.categoryName || "Unassigned"}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

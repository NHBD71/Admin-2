/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { Member, Category } from "../types";
import { MessageSquare, MessageCircle, Phone, PhoneCall, Facebook, Copy, Check, ShieldAlert, Edit, Trash2 } from "lucide-react";

interface MemberCardProps {
  member: Member;
  categoryName: string;
  isAdmin: boolean;
  onEdit?: (member: Member) => void;
  onDelete?: (member: Member) => void;
}

export const MemberCard: React.FC<MemberCardProps> = ({
  member,
  categoryName,
  isAdmin,
  onEdit,
  onDelete,
}) => {
  const [copiedImo, setCopiedImo] = useState(false);

  // Safely clean WhatsApp number for linking
  const getWhatsAppLink = (num: string) => {
    const cleanNum = num.replace(/[^0-9]/g, "");
    // Default prefix if missing, but usually wa.me deals with full numbers
    return `https://wa.me/${cleanNum}`;
  };

  // Safely format Faceook details
  const getFacebookLink = (link: string) => {
    if (!link) return "#";
    if (link.startsWith("http://") || link.startsWith("https://")) {
      return link;
    }
    return `https://facebook.com/${link}`;
  };

  const handleCopyImo = () => {
    if (member.imoNumber) {
      navigator.clipboard.writeText(member.imoNumber);
      setCopiedImo(true);
      setTimeout(() => setCopiedImo(false), 2000);
    }
  };

  // Helper gradient backgrounds depending on Category string
  const getGradColor = (cat: string) => {
    const lower = cat.toLowerCase();
    if (lower.includes("super")) return "from-amber-400 to-[#eab308]";
    if (lower.includes("master")) return "from-[#eab308] to-[#ca8a04]";
    if (lower.includes("sub")) return "from-yellow-300 to-amber-500";
    if (lower.includes("admin")) return "from-[#facc15] to-[#ca8a04]";
    return "from-amber-500 to-[#ca8a04]";
  };

  // Helper to translate category display names nicely in Bengali to fit 9wickets theme
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
    <div className="bg-[#0b1220]/90 backdrop-blur-2xl border border-white/10 p-5 rounded-3xl flex flex-col justify-between transition-all hover:scale-[1.02] hover:border-amber-500/30 hover:shadow-xl hover:shadow-amber-500/5 group h-full relative overflow-hidden">
      {/* Visual background ambient hint */}
      <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full blur-2xl group-hover:bg-amber-500/10 transition-colors"></div>

      <div>
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-4">
            {/* Profile Avatar Frame with glowing golden border */}
            <div className={`w-16 h-16 rounded-2xl bg-gradient-to-tr ${getGradColor(categoryName)} border-2 border-white/10 overflow-hidden shadow-xl flex-shrink-0 flex items-center justify-center`}>
              {member.profilePhoto ? (
                <img
                  src={member.profilePhoto}
                  alt={member.fullName}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-xl font-extrabold text-slate-950">
                  {member.fullName.substring(0, 2).toUpperCase()}
                </span>
              )}
            </div>

            <div>
              <h3 className="text-md font-black text-white tracking-snug group-hover:text-amber-400 transition-colors font-display">
                {member.fullName}
              </h3>
              <p className="text-xs text-slate-400 font-bold mt-0.5">{member.designation || "৯উইকেট প্রতিনিধি"}</p>
            </div>
          </div>

          {/* Admin Management Controls overlay */}
          {isAdmin && (
            <div className="flex items-center gap-1.5 ml-2">
              <button
                onClick={() => onEdit?.(member)}
                className="p-1.5 bg-white/10 hover:bg-white/20 border border-white/10 rounded-xl text-amber-300 hover:text-white transition-all cursor-pointer"
                title="Edit Profile"
              >
                <Edit className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => onDelete?.(member)}
                className="p-1.5 bg-red-500/25 hover:bg-red-500/40 border border-red-500/30 rounded-xl text-red-300 hover:text-white transition-all cursor-pointer"
                title="Delete Profile"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* Dynamic Category Pill & Agent ID prominent badge */}
        <div className="flex flex-wrap gap-2 items-center mb-4">
          <span className="text-[10px] text-amber-400 font-extrabold px-3 py-1 bg-amber-500/10 rounded-full border border-amber-500/25 uppercase tracking-widest leading-none">
            {getCategoryDisplayNameBn(categoryName)}
          </span>
          {member.agentId && (
            <span className="text-[10px] text-slate-350 font-black px-2.5 py-1 bg-slate-950 border border-white/5 rounded-full font-mono uppercase tracking-widest leading-none">
              ID: <span className="text-amber-400 font-bold">{member.agentId}</span>
            </span>
          )}
        </div>
      </div>

      {/* Structured Social Call-to-Actions */}
      <div className="space-y-3 mt-4 pt-4 border-t border-white/5">
        <div className="grid grid-cols-3 gap-2">
          {/* WA (WhatsApp) - High-priority */}
          <a
            href={getWhatsAppLink(member.whatsappNumber)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 bg-[#25D366]/10 hover:bg-[#25D366] hover:text-[#0b1220] border border-[#25D366]/25 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider text-[#25D366] flex flex-col items-center justify-center gap-1.5 transition-all text-center"
            title="Chat on WhatsApp"
          >
            <MessageCircle className="w-4 h-4 text-[#25D366] group-hover:text-inherit" />
            <span>WhatsApp</span>
          </a>

          {/* IMO */}
          <button
            onClick={handleCopyImo}
            className={`flex-1 cursor-pointer flex flex-col items-center justify-center gap-1.5 border py-2.5 rounded-xl text-[10px] uppercase tracking-wider transition-all text-center ${
              copiedImo
                ? "bg-amber-500 text-slate-950 border-amber-500 font-bold"
                : "bg-[#00a2ed]/10 hover:bg-[#00a2ed] border-[#00a2ed]/25 text-[#00a2ed] hover:text-white font-bold"
            }`}
            title="Copy IMO Details"
          >
            {copiedImo ? <Check className="w-4 h-4 text-slate-950" /> : <Phone className="w-4 h-4 text-[#00a2ed] group-hover:text-white" />}
            <span>{copiedImo ? "Copied" : "IMO"}</span>
          </button>

          {/* FB (Facebook) */}
          <a
            href={getFacebookLink(member.facebookLink)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 bg-[#1877F2]/10 hover:bg-[#1877F2] hover:text-white border border-[#1877F2]/25 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider text-blue-400 hover:text-white flex flex-col items-center justify-center gap-1.5 transition-all text-center"
            title="Visit Facebook Profile"
          >
            <Facebook className="w-4 h-4 text-[#1877F2] group-hover:text-white fill-current" />
            <span>Facebook</span>
          </a>
        </div>

        {/* Display individual numbers with clean modern mono labels and icons */}
        <div className="text-[11px] space-y-2 bg-slate-950/75 p-3 rounded-2xl border border-white/5">
          <div className="flex justify-between items-center text-slate-350">
            <span className="flex items-center gap-1 text-slate-400 font-bold font-sans">
              <MessageCircle className="w-3.5 h-3.5 text-[#25D366] flex-shrink-0" />
              WhatsApp:
            </span>
            <span className="text-white font-mono font-black select-all">{member.whatsappNumber || "N/A"}</span>
          </div>

          <div className="flex justify-between items-center text-slate-350">
            <span className="flex items-center gap-1 text-slate-400 font-bold font-sans">
              <Phone className="w-3.5 h-3.5 text-[#00a2ed] flex-shrink-0" />
              IMO ID/Num:
            </span>
            <div className="flex items-center gap-1">
              <span className="text-white font-mono font-black select-all">{member.imoNumber || "N/A"}</span>
              {member.imoNumber && (
                <button onClick={handleCopyImo} className="text-slate-400 hover:text-white focus:outline-none cursor-pointer p-0.5 rounded hover:bg-white/5 transition-colors" title="Copy IMO ID">
                  {copiedImo ? <Check className="w-3 h-3 text-amber-400" /> : <Copy className="w-3 h-3" />}
                </button>
              )}
            </div>
          </div>

          {member.facebookLink && (
            <div className="flex justify-between items-center text-slate-350 pt-1 border-t border-white/5">
              <span className="flex items-center gap-1 text-slate-400 font-bold font-sans">
                <Facebook className="w-3.5 h-3.5 text-[#1877F2] fill-current flex-shrink-0" />
                Facebook:
              </span>
              <span className="text-white font-mono font-semibold max-w-[150px] truncate select-all" title={member.facebookLink}>
                {member.facebookLink.replace(/^https?:\/\/(www\.)?facebook\.com\//, "") || "Link"}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

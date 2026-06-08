/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Timestamp } from "firebase/firestore";

export interface Member {
  id: string;
  agentId?: string; // e.g. M-101, A-10
  fullName: string;
  profilePhoto: string; // Firebase Storage URL, base64 fallback, or standard URL
  category: string; // Matches Category ID in Categories collection
  designation: string;
  facebookLink: string;
  imoNumber: string;
  whatsappNumber: string;
  createdAt: Timestamp | any;
}

export interface Category {
  id: string; // Unique path-friendly ID or firestore sub-id
  categoryName: string;
  createdAt: Timestamp | any;
}

export interface AdminUser {
  id: string;
  email: string;
  role: string;
  createdAt: Timestamp | any;
}

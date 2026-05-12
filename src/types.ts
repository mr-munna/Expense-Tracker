export interface EmployeePayment {
  id: string;
  uniqueId: string;
  timestamp: string;
  employeeName: string;
  projectName: string;
  payment: number;
  transport: number;
  createdByEmail?: string;
}

export interface ProjectExpense {
  id: string;
  uniqueId: string;
  projectName: string;
  timestamp: string;
  materialsCost: number;
  materialsName?: string;
  transportCost: number;
  othersCost: number;
  budget: number;
  createdByEmail?: string;
}

export interface TomorrowWorkRow {
  id: string;
  projectName: string;
  projectAddress: string;
  workDescription: string;
  manpowerList: string[];
  overtime: string;
  createdByEmail?: string;
}

export interface BillItem {
  id: string;
  areaName: string;
  tiles: string;
  qty: number;
  unit: string;
  price: number;
  total: number;
}

export interface Bill {
  id: string;
  type: 'BILL' | 'QUOTATION';
  billNumber: string;
  date: string;
  recipientName: string;
  site: string;
  subject: string;
  items: BillItem[];
  totalInWords: string;
  grandTotal: number;
  advance?: number;
  discount?: number;
  preparedBy: string;
  signature?: string;
  termsAndConditions?: string;
  timestamp: string;
  revision?: number;
  createdByEmail?: string;
}

export interface PDFSettings {
  companyName: string;
  logo?: string;
  headerBgColor: string;
  headerTextColor: string;
  footerBgColor: string;
  footerTextColor: string;
  address: string;
  email: string;
  contact: string;
  fontStyle: 'helvetica' | 'times' | 'courier';
  hideNameText?: boolean;
}

export interface CollectedBill {
  id: string;
  date: string;
  projectName: string;
  amount: number;
  createdByEmail?: string;
}

export interface PersonalReceivedMoney {
  id: string;
  date: string;
  amount: number;
  note?: string;
  method?: string;
  createdByEmail: string;
}

export interface PersonalGivenMoney {
  id: string;
  date: string;
  amount: number;
  name: string;
  projectName?: string;
  createdByEmail: string;
}

export interface Meeting {
  id: string;
  clientName: string;
  meetingDate: string; // ISO format "2026-04-29"
  meetingTime: string; // Time "14:30"
  agenda: string;
  reminderEnabled: boolean;
  createdAt: string;
  notificationId?: number;
  createdByEmail?: string;
}

export type UserRole = 'super_admin' | 'admin' | 'member';

export type AccessLevel = 'none' | 'view' | 'edit';

export interface UserPermissions {
  dashboard: AccessLevel;
  addData: AccessLevel;
  payments: AccessLevel;
  projects: AccessLevel;
  revenue: AccessLevel;
  tomorrowWork: AccessLevel;
  billing: AccessLevel;
  newBill: AccessLevel;
  newQuotation: AccessLevel;
  historyLogs: AccessLevel;
  pdfSettings: AccessLevel;
  exportBackup: AccessLevel;
  backupProtection: AccessLevel;
  projectList: AccessLevel;
  meetings: AccessLevel;
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  role: UserRole;
  isApproved: boolean;
  createdAt: string;
  permissions?: UserPermissions;
}

export interface ProjectListEntry {
  id: string;
  projectName: string;
  startDate: string;
  status: 'Ongoing' | 'Struk' | 'Upcoming' | 'Finished' | 'Handover';
  completeDate: string;
  photos?: Array<{
    id: string;
    url: string;
    title: string;
    type: 'Work Order' | 'Money Receipt' | 'Collect Bill' | 'Other';
    timestamp: number;
  }>;
}

export type View = 'DASHBOARD' | 'PROFILE' | 'PAYMENT_HISTORY' | 'PROJECT_SUMMARY' | 'REVENUE' | 'ADD_DATA' | 'EMPLOYEE_TOTALS' | 'EXPORT' | 'ABOUT' | 'CLOUD_SYNC' | 'CONTACT_INFO' | 'TOMORROW_WORK' | 'TOMORROW_WORK_HISTORY' | 'TOMORROW_WORK_DETAILS' | 'BILL' | 'QUOTATION' | 'BILL_HISTORY' | 'PDF_SETTINGS' | 'USERS' | 'PROJECT_LIST' | 'MEETINGS' | 'LIVE_LOCATIONS';

import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  Plus,
  Search,
  History,
  BarChart3,
  TrendingUp,
  LayoutDashboard,
  Menu,
  X,
  Calendar,
  ArrowLeft,
  Edit2,
  Trash2,
  Download,
  User,
  Info,
  Cloud,
  RefreshCw,
  CheckCircle2,
  ChevronUp,
  ChevronDown,
  AlertCircle,
  FileJson,
  Upload,
  FileSpreadsheet,
  Phone,
  Mail,
  Facebook,
  Linkedin,
  Github,
  Globe,
  Eye,
  Check,
  Maximize2,
  PieChart as PieChartIcon,
  Receipt,
  FileText,
  Printer,
  Share2,
  LogOut,
  LogIn,
  UserPlus,
  ShieldX,
  Users as UsersIcon,
  ShieldCheck,
  ShieldAlert,
  Shield,
  CalendarClock,
  Briefcase,
  Bell,
  BellRing,
  Clock,
  Pencil,
  Image as ImageIcon,
  Camera,
  MapPin,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { Filesystem, Directory, Encoding } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import { LocalNotifications } from "@capacitor/local-notifications";
import {
  EmployeePayment,
  ProjectExpense,
  View,
  TomorrowWorkRow,
  Bill,
  BillItem,
  PDFSettings,
  UserRole,
  UserProfile,
  CollectedBill,
  PersonalReceivedMoney,
  PersonalGivenMoney,
  ProjectListEntry,
  Meeting,
} from "./types";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

import {
  auth,
  db,
  googleProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  doc,
  getDoc,
  getDocs,
  setDoc,
  collection,
  query,
  where,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  Timestamp,
  FirebaseUser,
} from "./firebase";

// Helper to format currency
const formatCurrency = (amount: number) => {
  return `Tk. ${amount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

import { toJpeg } from "html-to-image";

const compressImage = (base64Str: string, maxWidth = 800, maxHeight = 800, quality = 0.7): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = base64Str;
    img.onload = () => {
      const canvas = document.createElement("canvas");
      let width = img.width;
      let height = img.height;

      if (width > height) {
        if (width > maxWidth) {
          height *= maxWidth / width;
          width = maxWidth;
        }
      } else {
        if (height > maxHeight) {
          width *= maxHeight / height;
          height = maxHeight;
        }
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      ctx?.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL("image/jpeg", quality));
    };
  });
};

const generateId = () => {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    try {
      return crypto.randomUUID();
    } catch (e) {}
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

const DEFAULT_PDF_SETTINGS: PDFSettings = {
  companyName: "ALTASMIM ENGINEERING",
  headerBgColor: "#FFFFFF",
  headerTextColor: "#DC0000",
  footerBgColor: "#FFFFFF",
  footerTextColor: "#000000",
  address: "House 66, dag 1041, Khilbarirtek, Batagoli, Shahajadpur, Dhaka.",
  email: "altasmimengineering@gmail.com",
  contact: "+8801703862448",
  fontStyle: "helvetica",
  hideNameText: false,
};

// --- Auth Context ---
export type PermissionModule =
  | "dashboard"
  | "addData"
  | "payments"
  | "projects"
  | "revenue"
  | "tomorrowWork"
  | "billing"
  | "newBill"
  | "newQuotation"
  | "historyLogs"
  | "pdfSettings"
  | "exportBackup"
  | "backupProtection"
  | "projectList"
  | "meetings";

interface AuthContextType {
  user: FirebaseUser | null;
  profile: UserProfile | null;
  loading: boolean;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  isMember: boolean;
  logout: () => Promise<void>;
  hasPermission: (module: PermissionModule, level: "view" | "edit") => boolean;
}

const AuthContext = React.createContext<AuthContextType | null>(null);

function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        // Get profile
        const userDocRef = doc(db, "users", firebaseUser.uid);
        const snap = await getDoc(userDocRef);

        if (snap.exists()) {
          let currentProfile = snap.data() as UserProfile;

          // Migration for existing users to add permissions
          if (!currentProfile.permissions) {
            const isSuperAdminEmail =
              firebaseUser.email === "bijoymahmudmunna@gmail.com";
            const isAdmin =
              currentProfile.role === "admin" ||
              currentProfile.role === "super_admin";
            const defaultLevel = isAdmin ? "edit" : "view";
            currentProfile.permissions = {
              dashboard: defaultLevel,
              addData: "edit", // Member can save data
              payments: defaultLevel,
              projects: defaultLevel,
              revenue: defaultLevel,
              tomorrowWork: defaultLevel,
              billing: defaultLevel,
              newBill: defaultLevel,
              newQuotation: defaultLevel,
              historyLogs: defaultLevel,
              pdfSettings: defaultLevel,
              exportBackup: defaultLevel,
              backupProtection: defaultLevel,
              projectList: defaultLevel,
              meetings: defaultLevel,
            };
            if (isSuperAdminEmail) {
              currentProfile.isApproved = true;
              currentProfile.role = "super_admin";
              currentProfile.permissions = {
                dashboard: "edit",
                addData: "edit",
                payments: "edit",
                projects: "edit",
                revenue: "edit",
                tomorrowWork: "edit",
                billing: "edit",
                newBill: "edit",
                newQuotation: "edit",
                historyLogs: "edit",
                pdfSettings: "edit",
                exportBackup: "edit",
                backupProtection: "edit",
                projectList: "edit",
                meetings: "edit",
              };
            }
            await updateDoc(userDocRef, {
              permissions: currentProfile.permissions,
              isApproved: currentProfile.isApproved,
              role: currentProfile.role,
            });
          }

          // Ensure all keys exist in permissions if they added new ones
          const expectedKeys = [
            "dashboard",
            "addData",
            "payments",
            "projects",
            "revenue",
            "tomorrowWork",
            "billing",
            "newBill",
            "newQuotation",
            "historyLogs",
            "pdfSettings",
            "exportBackup",
            "backupProtection",
            "projectList",
            "meetings",
          ];
          let needsUpdate = false;
          if (currentProfile.permissions) {
            expectedKeys.forEach((key) => {
              if (!(currentProfile.permissions as any)[key]) {
                (currentProfile.permissions as any)[key] =
                  currentProfile.role === "super_admin" ||
                  currentProfile.role === "admin"
                    ? "edit"
                    : (key === "addData" ? "edit" : "none");
                needsUpdate = true;
              }
            });
            if (needsUpdate) {
              await updateDoc(userDocRef, {
                permissions: currentProfile.permissions,
              });
            }
          }

          setProfile(currentProfile);

          // Sync photoURL if missing
          if (!currentProfile.photoURL && firebaseUser.photoURL) {
            await updateDoc(userDocRef, { photoURL: firebaseUser.photoURL });
          }
        } else {
          // If profile doesn't exist, we don't automatically create it anymore (as per user request)
          // except for the super admin email for bootstrapping
          const isSuperAdminEmail =
            firebaseUser.email === "bijoymahmudmunna@gmail.com";
          if (isSuperAdminEmail) {
            const superAdminProfile: UserProfile = {
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              displayName: firebaseUser.displayName || "Super Admin",
              role: "super_admin",
              isApproved: true,
              createdAt: new Date().toISOString(),
              permissions: {
                dashboard: "edit",
                addData: "edit",
                payments: "edit",
                projects: "edit",
                revenue: "edit",
                tomorrowWork: "edit",
                billing: "edit",
                newBill: "edit",
                newQuotation: "edit",
                historyLogs: "edit",
                pdfSettings: "edit",
                exportBackup: "edit",
                backupProtection: "edit",
                projectList: "edit",
                meetings: "edit",
              },
            };
            await setDoc(userDocRef, superAdminProfile);
            setProfile(superAdminProfile);
          } else {
            setProfile(null);
          }
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const isApproved =
    profile?.isApproved === true ||
    user?.email === "bijoymahmudmunna@gmail.com";
  const isAdmin =
    isApproved &&
    (profile?.role === "admin" ||
      profile?.role === "super_admin" ||
      user?.email === "bijoymahmudmunna@gmail.com");
  const isSuperAdmin =
    isApproved &&
    (profile?.role === "super_admin" ||
      user?.email === "bijoymahmudmunna@gmail.com");
  const isMember = isApproved && !!profile;

  const hasPermission = (module: PermissionModule, level: "view" | "edit") => {
    if (!profile) return false;
    if (user?.email === "bijoymahmudmunna@gmail.com") return true;
    if (isSuperAdmin) return true;

    // Fallbacks for older profiles
    if (!profile.permissions) {
      if (isAdmin) return true;
      if (
        module === "dashboard" ||
        module === "tomorrowWork" ||
        module === "payments" ||
        module === "projects" ||
        module === "revenue"
      )
        return true; // Default view access
      return false;
    }

    const p = profile.permissions[module];
    if (level === "edit") return p === "edit";
    if (level === "view") return p === "view" || p === "edit";
    return false;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        isAdmin,
        isSuperAdmin,
        isMember,
        logout,
        hasPermission,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

function useAuth() {
  const context = React.useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}

// --- Main App Wrapper ---
enum OperationType {
  CREATE = "create",
  UPDATE = "update",
  DELETE = "delete",
  LIST = "list",
  GET = "get",
  WRITE = "write",
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null,
) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error("Firestore Error: ", JSON.stringify(errInfo));
  const msg = error instanceof Error ? error.message : String(error);
  if (msg.toLowerCase().includes("permission") || msg.toLowerCase().includes("insufficient")) {
      alert("Permission Denied: You do not have authority to perform this action.");
  } else {
      alert("Error: " + msg);
  }
  throw new Error(JSON.stringify(errInfo));
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;

function AppContent() {
  const {
    user,
    profile,
    loading,
    isAdmin,
    isSuperAdmin,
    isMember,
    logout,
    hasPermission,
  } = useAuth();
  const [currentView, setCurrentView] = useState<View>("DASHBOARD");

  const [payments, setPayments] = useState<EmployeePayment[]>([]);
  const [projectExpenses, setProjectExpenses] = useState<ProjectExpense[]>([]);
  const [tomorrowWorkData, setTomorrowWorkData] = useState<{
    [date: string]: TomorrowWorkRow[];
  }>({});
  const [manpowerSuggestions, setManpowerSuggestions] = useState<string[]>([]);
  const [projectSuggestions, setProjectSuggestions] = useState<string[]>([]);
  const [addressSuggestions, setAddressSuggestions] = useState<string[]>([]);
  const [workSuggestions, setWorkSuggestions] = useState<string[]>([]);
  const [tomorrowWorkDate, setTomorrowWorkDate] = useState<string>(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split("T")[0];
  });
  const [currentTomorrowWorkRows, setCurrentTomorrowWorkRows] = useState<
    TomorrowWorkRow[]
  >([
    {
      id: generateId(),
      projectName: "",
      projectAddress: "",
      workDescription: "",
      manpowerList: [],
      overtime: "",
    },
  ]);
  const [bills, setBills] = useState<Bill[]>([]);
  const [quotations, setQuotations] = useState<Bill[]>([]);
  const [collectedBills, setCollectedBills] = useState<CollectedBill[]>([]);
  const [personalReceivedMoney, setPersonalReceivedMoney] = useState<PersonalReceivedMoney[]>([]);
  const [personalGivenMoney, setPersonalGivenMoney] = useState<PersonalGivenMoney[]>([]);
  const [nextBillNumber, setNextBillNumber] = useState<number>(1);
  const [nextQuotationNumber, setNextQuotationNumber] = useState<number>(1);
  const [editingBill, setEditingBill] = useState<Bill | null>(null);
  const [pdfSettings, setPdfSettings] =
    useState<PDFSettings>(DEFAULT_PDF_SETTINGS);
  const [projectList, setProjectList] = useState<ProjectListEntry[]>([]);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [activeAlarm, setActiveAlarm] = useState<Meeting | null>(null);

  // --- Foreground Alarm Logic ---
  useEffect(() => {
    // Request basic browser notification permission
    if (
      "Notification" in window &&
      Notification.permission !== "granted" &&
      Notification.permission !== "denied"
    ) {
      Notification.requestPermission();
    }

    if (meetings.length === 0) return;

    const playBeep = () => {
      try {
        const audioCtx = new (
          window.AudioContext || (window as any).webkitAudioContext
        )();
        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        oscillator.type = "sine";
        oscillator.frequency.value = 800;
        gainNode.gain.setValueAtTime(1, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(
          0.001,
          audioCtx.currentTime + 1,
        );
        oscillator.start(audioCtx.currentTime);
        oscillator.stop(audioCtx.currentTime + 1);
      } catch (e) {
        console.error("Audio play failed", e);
      }
    };

    const checkAlarms = () => {
      const now = new Date();
      const alertedMeetings = JSON.parse(
        localStorage.getItem("alertedMeetings") || "[]",
      );

      meetings.forEach((meeting) => {
        if (!meeting.reminderEnabled) return;
        if (alertedMeetings.includes(meeting.id)) return;

        const meetingTime = new Date(
          `${meeting.meetingDate}T${meeting.meetingTime}`,
        );
        const diffMs = meetingTime.getTime() - now.getTime();

        // If meeting is exactly happening now or within the last 2 minutes
        if (diffMs <= 0 && diffMs > -120000) {
          // Play Beep 3 times
          playBeep();
          setTimeout(playBeep, 500);
          setTimeout(playBeep, 1000);

          // Show browser notification
          if (
            "Notification" in window &&
            Notification.permission === "granted"
          ) {
            new Notification(`Meeting: ${meeting.clientName}`, {
              body: `Your meeting is starting now!\nAgenda: ${meeting.agenda}`,
              icon: "https://placehold.jp/dc2626/ffffff/192x192.png?text=AE",
            });
            if (navigator.vibrate) navigator.vibrate([300, 100, 300, 100, 300]);
          }

          // Show in-app alert
          setActiveAlarm(meeting);

          // Mark as alerted
          alertedMeetings.push(meeting.id);
          localStorage.setItem(
            "alertedMeetings",
            JSON.stringify(alertedMeetings),
          );
        }
      });
    };

    const intervalId = setInterval(checkAlarms, 10000); // Check every 10 seconds
    return () => clearInterval(intervalId);
  }, [meetings]);

  // --- Firestore Listeners ---
  useEffect(() => {
    if (!isMember) return;

    const unsubMeetings = onSnapshot(collection(db, "meetings"), (snap) => {
      setMeetings(
        snap.docs.map((doc) => ({ ...doc.data(), id: doc.id }) as Meeting),
      );
    });

    const unsubPayments = onSnapshot(collection(db, "payments"), (snap) => {
      setPayments(
        snap.docs.map(
          (doc) => ({ ...doc.data(), id: doc.id }) as EmployeePayment,
        ),
      );
    });

    const unsubExpenses = onSnapshot(collection(db, "expenses"), (snap) => {
      setProjectExpenses(
        snap.docs.map(
          (doc) => ({ ...doc.data(), id: doc.id }) as ProjectExpense,
        ),
      );
    });

    const unsubBills = onSnapshot(collection(db, "bills"), (snap) => {
      const billsList = snap.docs.map(
        (doc) => ({ ...doc.data(), id: doc.id }) as Bill,
      );
      setBills(billsList);

      const maxBill = Math.max(
        0,
        ...billsList.map((b) => {
          const match = b.billNumber?.match(/\d+/);
          return match ? parseInt(match[0], 10) : 0;
        }),
      );
      setNextBillNumber(maxBill + 1);
    });

    const unsubQuotations = onSnapshot(collection(db, "quotations"), (snap) => {
      const quotationsList = snap.docs.map(
        (doc) => ({ ...doc.data(), id: doc.id }) as Bill,
      );
      setQuotations(quotationsList);

      const maxQuo = Math.max(
        0,
        ...quotationsList.map((b) => {
          const match = b.billNumber?.match(/\d+/);
          return match ? parseInt(match[0], 10) : 0;
        }),
      );
      setNextQuotationNumber(maxQuo + 1);
    });

    const unsubCollectedBills = onSnapshot(
      collection(db, "collectedBills"),
      (snap) => {
        setCollectedBills(
          snap.docs.map(
            (doc) => ({ ...doc.data(), id: doc.id }) as CollectedBill,
          ),
        );
      },
      (error) => {
        const errInfo = {
          error: error instanceof Error ? error.message : String(error),
          authInfo: { userId: user?.uid, email: user?.email },
          operationType: "get",
          path: "collectedBills"
        };
        console.error("Firestore Error: ", JSON.stringify(errInfo));
      }
    );

    const unsubPersonalReceivedMoney = onSnapshot(
      collection(db, "personalReceivedMoney"),
      (snap) => {
        setPersonalReceivedMoney(
          snap.docs.map(
            (doc) => ({ ...doc.data(), id: doc.id }) as PersonalReceivedMoney,
          ),
        );
      },
      (error) => {
        const errInfo = {
          error: error instanceof Error ? error.message : String(error),
          authInfo: { userId: user?.uid, email: user?.email },
          operationType: "get",
          path: "personalReceivedMoney"
        };
        console.error("Firestore Error: ", JSON.stringify(errInfo));
      }
    );

    const unsubPersonalGivenMoney = onSnapshot(
      collection(db, "personalGivenMoney"),
      (snap) => {
        setPersonalGivenMoney(
          snap.docs.map(
            (doc) => ({ ...doc.data(), id: doc.id }) as PersonalGivenMoney,
          ),
        );
      },
      (error) => {
        const errInfo = {
          error: error instanceof Error ? error.message : String(error),
          authInfo: { userId: user?.uid, email: user?.email },
          operationType: "get",
          path: "personalGivenMoney"
        };
        console.error("Firestore Error: ", JSON.stringify(errInfo));
      }
    );

    const unsubSettings = onSnapshot(doc(db, "settings", "pdf"), (snap) => {
      if (snap.exists()) {
        setPdfSettings(snap.data() as PDFSettings);
      }
    });

    const unsubTomorrow = onSnapshot(
      doc(db, "settings", "tomorrowWork"),
      (snap) => {
        if (snap.exists()) {
          setTomorrowWorkData(
            snap.data() as { [date: string]: TomorrowWorkRow[] },
          );
        }
      },
    );

    const unsubProjectList = onSnapshot(
      collection(db, "project_list"),
      (snap) => {
        setProjectList(
          snap.docs.map(
            (doc) => ({ ...doc.data(), id: doc.id }) as ProjectListEntry,
          ),
        );
      },
    );

    return () => {
      unsubPayments();
      unsubExpenses();
      unsubBills();
      unsubQuotations();
      unsubCollectedBills();
      unsubPersonalReceivedMoney();
      unsubPersonalGivenMoney();
      unsubSettings();
      unsubTomorrow();
      unsubProjectList();
      unsubMeetings();
    };
  }, [isMember]);

  // Load current rows when date changes
  useEffect(() => {
    const saved = tomorrowWorkData[tomorrowWorkDate];
    if (saved && saved.length > 0) {
      setCurrentTomorrowWorkRows(saved);
    }
    // If no saved data, we KEEP the current rows.
    // This allows users to change the date without losing their work.
  }, [tomorrowWorkDate, tomorrowWorkData]);

  // Sync suggestions with tomorrowWorkData (history)
  useEffect(() => {
    const projects = new Set<string>();
    const addresses = new Set<string>();
    const works = new Set<string>();
    const manpower = new Set<string>();

    Object.values(tomorrowWorkData).forEach((dayRows: TomorrowWorkRow[]) => {
      dayRows.forEach((row) => {
        if (row.projectName.trim()) projects.add(row.projectName.trim());
        if (row.projectAddress.trim()) addresses.add(row.projectAddress.trim());
        if (row.workDescription.trim()) works.add(row.workDescription.trim());
        row.manpowerList.forEach((m) => {
          if (m.trim()) manpower.add(m.trim());
        });
      });
    });

    setProjectSuggestions(
      Array.from(
        new Set([...projects, ...projectList.map((p) => p.projectName)]),
      ).sort(),
    );
    setAddressSuggestions(Array.from(addresses).sort());
    setWorkSuggestions(Array.from(works).sort());
    setManpowerSuggestions(Array.from(manpower).sort());
  }, [tomorrowWorkData]);

  const [searchQuery, setSearchQuery] = useState("");
  const [historyFilter, setHistoryFilter] = useState<
    "Daily" | "Monthly" | "Annual" | "Custom"
  >("Daily");

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const mainRef = useRef<HTMLDivElement>(null);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    setShowScrollTop(target.scrollTop > 200);
  };

  const scrollToTop = () => {
    mainRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  };

  const updateTomorrowWorkData = async (newData: {
    [date: string]: TomorrowWorkRow[];
  }) => {
    try {
      await setDoc(doc(db, "settings", "tomorrowWork"), newData);
    } catch (error: any) {
      console.error("Error updating tomorrow work data:", error);
      alert("Failed to save data. You may not have permission.");
      throw error; // Rethrow to catch in UI so it doesn't navigate
    }
  };

  const updatePdfSettings = async (newSettings: PDFSettings) => {
    try {
      await setDoc(doc(db, "settings", "pdf"), newSettings);
    } catch (error) {
      console.error("Error updating PDF settings:", error);
    }
  };

  const stats = useMemo(() => {
    const totalPayment = payments.reduce((sum, p) => sum + p.payment, 0);
    const totalEmployeeTransport = payments.reduce(
      (sum, p) => sum + (p.transport || 0),
      0,
    );
    const totalTransport = projectExpenses.reduce(
      (sum, p) => sum + p.transportCost,
      0,
    );
    const totalMaterials = projectExpenses.reduce(
      (sum, p) => sum + p.materialsCost,
      0,
    );
    const totalOthers = projectExpenses.reduce(
      (sum, p) => sum + p.othersCost,
      0,
    );

    const employeeCost = totalPayment + totalEmployeeTransport;
    const materialsCost = totalMaterials + totalTransport + totalOthers;
    const totalExpense = employeeCost + materialsCost;

    return {
      employeeCost,
      materialsCost,
      totalExpense,
    };
  }, [payments, projectExpenses]);

  const [updateAvailable, setUpdateAvailable] = useState(false);

  useEffect(() => {
    // Version check to force update if needed
    const CURRENT_VERSION = "2.1.3"; // Increment this to force a reload for all users
    const savedVersion = localStorage.getItem("app_version");
    
    if (savedVersion && savedVersion !== CURRENT_VERSION) {
      console.log("New version detected, clearing cache...");
      if ("caches" in window) {
        caches.keys().then(names => {
          for (const name of names) caches.delete(name);
        });
      }
      localStorage.setItem("app_version", CURRENT_VERSION);
      setTimeout(() => window.location.reload(), 500);
    } else if (!savedVersion) {
      localStorage.setItem("app_version", CURRENT_VERSION);
    }

    // Check for Service Worker updates
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.getRegistration().then((reg) => {
        if (reg) {
          if (reg.waiting) {
            setUpdateAvailable(true);
          }
          reg.addEventListener("updatefound", () => {
            const newWorker = reg.installing;
            if (newWorker) {
              newWorker.addEventListener("statechange", () => {
                if (
                  newWorker.state === "installed" &&
                  navigator.serviceWorker.controller
                ) {
                  setUpdateAvailable(true);
                }
              });
            }
          });
        }
      });
    }

    // Force Service Worker update check every hour
    const checkUpdate = async () => {
      if ("serviceWorker" in navigator) {
        try {
          const registration = await navigator.serviceWorker.getRegistration();
          if (registration) {
            console.log("Checking for app updates...");
            await registration.update();
          }
        } catch (err) {
          console.error("SW update check failed:", err);
        }
      }
    };

    const interval = setInterval(checkUpdate, 1000 * 60 * 60); // 1 hour
    checkUpdate(); // and on mount

    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-4">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
          className="w-12 h-12 border-4 border-[#0D47A1] border-t-transparent rounded-full mb-4"
        />
        <p className="text-[#64748B] font-medium animate-pulse">
          Initializing Application...
        </p>
      </div>
    );
  }

  if (!user) {
    return <LoginView />;
  }

  if (
    profile &&
    !profile.isApproved &&
    user?.email !== "bijoymahmudmunna@gmail.com"
  ) {
    const isNewSignup =
      user?.metadata?.creationTime === user?.metadata?.lastSignInTime;

    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-6 text-center">
        <div className="bg-white p-8 rounded-3xl shadow-xl max-w-sm w-full border border-slate-100">
          <div className="w-20 h-20 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <ShieldAlert className="w-10 h-10 text-amber-500" />
          </div>
          <h2 className="text-2xl font-bold text-slate-800 mb-3">
            {isNewSignup ? "Account Created!" : "Approval Pending"}
          </h2>
          <p className="text-slate-600 mb-8">
            {isNewSignup
              ? "Your account has been created successfully. It is now waiting for Super Admin approval. Please contact the administrator to get access."
              : "Your account is currently waiting for Super Admin approval. Please contact the administrator to get access."}
          </p>
          <button
            onClick={logout}
            className="w-full py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-all flex items-center justify-center gap-2"
          >
            <LogOut className="w-5 h-5" />
            Logout
          </button>
        </div>
      </div>
    );
  }

  const addPayment = async (payment: Omit<EmployeePayment, "id">) => {
    try {
      const id = generateId();
      await setDoc(doc(db, "payments", id), {
        ...payment,
        id,
        createdBy: user?.uid,
        createdByEmail: user?.email || null,
      });
    } catch (error: any) {
      console.error("Error adding payment:", error);
      alert("Failed to save data. You may not have permission.");
      throw error;
    }
  };

  const addProjectExpense = async (expense: Omit<ProjectExpense, "id">) => {
    try {
      const id = generateId();
      await setDoc(doc(db, "expenses", id), {
        ...expense,
        id,
        createdBy: user?.uid,
        createdByEmail: user?.email || null,
      });
    } catch (error: any) {
      console.error("Error adding expense:", error);
      alert("Failed to save data. You may not have permission.");
      throw error;
    }
  };

  const addCollectedBill = async (bill: Omit<CollectedBill, "id">) => {
    try {
      const id = generateId();
      await setDoc(doc(db, "collectedBills", id), {
        ...bill,
        id,
        createdBy: user?.uid,
        createdByEmail: user?.email || null,
      });
    } catch (error: any) {
      console.error("Error adding collected bill:", error);
      alert("Failed to collect bill. You may not have permission.");
      throw error;
    }
  };

  const addPersonalReceivedMoney = async (money: Omit<PersonalReceivedMoney, "id">) => {
    try {
      const id = generateId();
      await setDoc(doc(db, "personalReceivedMoney", id), {
        ...money,
        id,
        createdBy: user?.uid,
        createdByEmail: user?.email || null,
      });
    } catch (error: any) {
      console.error("Error adding personal received money:", error);
      alert("Failed to save received money. You may not have permission.");
      throw error;
    }
  };

  const updatePersonalReceivedMoney = async (money: PersonalReceivedMoney) => {
    try {
      await updateDoc(doc(db, "personalReceivedMoney", money.id), {
        ...money,
      });
    } catch (error: any) {
      console.error("Error updating personal received money:", error);
      alert("Failed to update received money. You may not have permission.");
      throw error;
    }
  };

  const deletePersonalReceivedMoney = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this received money record?")) return;
    try {
      await deleteDoc(doc(db, "personalReceivedMoney", id));
    } catch (error: any) {
      console.error("Error deleting personal received money:", error);
      alert("Failed to delete received money. You may not have permission.");
      throw error;
    }
  };

  const addPersonalGivenMoney = async (money: Omit<PersonalGivenMoney, "id">) => {
    try {
      const id = generateId();
      await setDoc(doc(db, "personalGivenMoney", id), {
        ...money,
        id,
        createdBy: user?.uid,
        createdByEmail: user?.email || null,
      });
    } catch (error: any) {
      console.error("Error adding personal given money:", error);
      alert("Failed to save given money. You may not have permission.");
      throw error;
    }
  };

  const updatePersonalGivenMoney = async (money: PersonalGivenMoney) => {
    try {
      await updateDoc(doc(db, "personalGivenMoney", money.id), {
        ...money,
      });
    } catch (error: any) {
      console.error("Error updating personal given money:", error);
      alert("Failed to update given money. You may not have permission.");
      throw error;
    }
  };

  const deletePersonalGivenMoney = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this given money record?")) return;
    try {
      await deleteDoc(doc(db, "personalGivenMoney", id));
    } catch (error: any) {
      console.error("Error deleting personal given money:", error);
      alert("Failed to delete given money. You may not have permission.");
      throw error;
    }
  };

  const deleteProjectData = async (projectName: string) => {
    if (
      !window.confirm(
        `Are you sure you want to delete ALL data (expenses, payments, bills) for project: "${projectName}"? This cannot be undone.`,
      )
    )
      return;

    try {
      const normalizedName = projectName.trim().toLowerCase();

      // Delete from expenses
      const expensesToDelete = projectExpenses.filter(
        (pe) => pe.projectName.trim().toLowerCase() === normalizedName,
      );
      for (const ex of expensesToDelete) {
        await deleteDoc(doc(db, "expenses", ex.id));
      }

      // Delete from payments
      const paymentsToDelete = payments.filter(
        (p) => p.projectName.trim().toLowerCase() === normalizedName,
      );
      for (const p of paymentsToDelete) {
        await deleteDoc(doc(db, "payments", p.id));
      }

      // Delete from collectedBills
      const billsToDelete = collectedBills.filter(
        (b) => b.projectName.trim().toLowerCase() === normalizedName,
      );
      for (const b of billsToDelete) {
        await deleteDoc(doc(db, "collectedBills", b.id));
      }

      // Delete from projectList
      const listEntriesToDelete = projectList.filter(
        (pl) => pl.projectName.trim().toLowerCase() === normalizedName,
      );
      for (const pl of listEntriesToDelete) {
        await deleteDoc(doc(db, "project_list", pl.id));
      }

      alert(`Successfully deleted all data for project: ${projectName}`);
    } catch (error) {
      handleFirestoreError(
        error,
        OperationType.DELETE,
        `project data for ${projectName}`,
      );
    }
  };

  const deleteCollectedBill = async (id: string) => {
    try {
      await deleteDoc(doc(db, "collectedBills", id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `collectedBills/${id}`);
    }
  };

  const deletePayment = async (id: string) => {
    try {
      await deleteDoc(doc(db, "payments", id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `payments/${id}`);
    }
  };

  const deletePayments = async (ids: string[]) => {
    try {
      for (const id of ids) {
        await deleteDoc(doc(db, "payments", id));
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `multiple payments`);
    }
  };

  const updatePayment = async (
    id: string,
    updated: Partial<EmployeePayment>,
  ) => {
    try {
      await updateDoc(doc(db, "payments", id), updated);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `payments/${id}`);
    }
  };

  const deleteProjectExpense = async (id: string) => {
    try {
      await deleteDoc(doc(db, "expenses", id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `expenses/${id}`);
    }
  };

  const deleteProjectExpenses = async (ids: string[]) => {
    try {
      for (const id of ids) {
        await deleteDoc(doc(db, "expenses", id));
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `multiple expenses`);
    }
  };

  const updateProjectExpense = async (
    id: string,
    updated: Partial<ProjectExpense>,
  ) => {
    try {
      await updateDoc(doc(db, "expenses", id), updated);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `expenses/${id}`);
    }
  };

  const updateProjectBudget = async (
    projectName: string,
    newBudget: number,
  ) => {
    const existingProject = projectExpenses.find(
      (pe) =>
        pe.projectName.trim().toLowerCase() ===
        projectName.trim().toLowerCase(),
    );

    if (existingProject) {
      try {
        await updateDoc(doc(db, "expenses", existingProject.id), {
          budget: newBudget,
        });
      } catch (error) {
        console.error("Error updating budget:", error);
      }
    } else {
      try {
        const id = generateId();
        await setDoc(doc(db, "expenses", id), {
          id,
          uniqueId:
            "ATP-" +
            Math.floor(Math.random() * 1000000)
              .toString()
              .padStart(6, "0"),
          projectName: projectName,
          timestamp: new Date().toLocaleString("en-GB"),
          materialsCost: 0,
          transportCost: 0,
          othersCost: 0,
          budget: newBudget,
          createdBy: user?.uid,
        });
      } catch (error) {
        console.error("Error creating project with budget:", error);
      }
    }
  };

  const handleConvertToBill = (quotation: Bill) => {
    const convertedBill: Bill = {
      ...quotation,
      id: generateId(),
      type: "BILL",
      billNumber: `AE-B-${nextBillNumber.toString().padStart(4, "0")}`,
      date: new Date().toISOString().split("T")[0],
      advance: 0,
      discount: 0,
      subject: quotation.subject.replace(/Quotation/i, "Bill"),
    };
    setEditingBill(convertedBill);
    setCurrentView("BILL");
  };

  const renderView = () => {
    switch (currentView) {
      case "DASHBOARD":
        return (
          <DashboardView
            stats={stats}
            payments={payments}
            projectExpenses={projectExpenses}
            onDetails={() => setCurrentView("PAYMENT_HISTORY")}
          />
        );
      case "PROFILE":
        return (
          <ProfileDashboardView
            payments={payments}
            projectExpenses={projectExpenses}
            personalReceivedMoney={personalReceivedMoney}
            personalGivenMoney={personalGivenMoney}
            onAddPersonalReceivedMoney={addPersonalReceivedMoney}
            onUpdatePersonalReceivedMoney={updatePersonalReceivedMoney}
            onDeletePersonalReceivedMoney={deletePersonalReceivedMoney}
            onAddPersonalGivenMoney={addPersonalGivenMoney}
            onUpdatePersonalGivenMoney={updatePersonalGivenMoney}
            onDeletePersonalGivenMoney={deletePersonalGivenMoney}
          />
        );
      case "PAYMENT_HISTORY":
        if (!hasPermission("payments", "view"))
          return (
            <DashboardView
              stats={stats}
              payments={payments}
              projectExpenses={projectExpenses}
              onDetails={() => setCurrentView("PAYMENT_HISTORY")}
            />
          );
        return (
          <PaymentHistoryView
            payments={payments}
            projectExpenses={projectExpenses}
            filter={historyFilter}
            setFilter={setHistoryFilter}
            onDeletePayment={deletePayment}
            onDeletePayments={deletePayments}
            onUpdatePayment={updatePayment}
            onDeleteProject={deleteProjectExpense}
            onDeleteProjects={deleteProjectExpenses}
            onUpdateProject={updateProjectExpense}
            isAdmin={hasPermission("payments", "edit")}
            isSuperAdmin={isSuperAdmin}
          />
        );
      case "PROJECT_SUMMARY":
        if (!hasPermission("projects", "view"))
          return (
            <DashboardView
              stats={stats}
              payments={payments}
              projectExpenses={projectExpenses}
              onDetails={() => setCurrentView("PAYMENT_HISTORY")}
            />
          );
        return (
          <ProjectSummaryView
            payments={payments}
            projectExpenses={projectExpenses}
          />
        );
      case "PROJECT_LIST":
        if (!hasPermission("projectList", "view"))
          return (
            <DashboardView
              stats={stats}
              payments={payments}
              projectExpenses={projectExpenses}
              onDetails={() => setCurrentView("PAYMENT_HISTORY")}
            />
          );
        return (
          <ProjectListView
            projects={projectList}
            isAdmin={isAdmin}
            isSuperAdmin={isSuperAdmin}
            onBack={() => setCurrentView("DASHBOARD")}
          />
        );
      case "REVENUE":
        if (!hasPermission("revenue", "view"))
          return (
            <DashboardView
              stats={stats}
              payments={payments}
              projectExpenses={projectExpenses}
              onDetails={() => setCurrentView("PAYMENT_HISTORY")}
            />
          );
        return (
          <RevenueView
            projectExpenses={projectExpenses}
            payments={payments}
            collectedBills={collectedBills}
            onAddCollectedBill={addCollectedBill}
            onDeleteCollectedBill={deleteCollectedBill}
            onDeleteProjectData={deleteProjectData}
            onUpdateBudget={updateProjectBudget}
            isAdmin={hasPermission("revenue", "edit")}
            isSuperAdmin={isSuperAdmin}
            projectList={projectList}
          />
        );
      case "EMPLOYEE_TOTALS":
        if (!hasPermission("payments", "view"))
          return (
            <DashboardView
              stats={stats}
              payments={payments}
              projectExpenses={projectExpenses}
              onDetails={() => setCurrentView("PAYMENT_HISTORY")}
            />
          );
        return (
          <EmployeeTotalsView
            payments={payments}
            onBack={() => setCurrentView("DASHBOARD")}
          />
        );
      case "EXPORT":
        if (!hasPermission("exportBackup", "view"))
          return (
            <DashboardView
              stats={stats}
              payments={payments}
              projectExpenses={projectExpenses}
              onDetails={() => setCurrentView("PAYMENT_HISTORY")}
            />
          );
        return (
          <ExportView
            payments={payments}
            projectExpenses={projectExpenses}
            bills={[...bills, ...quotations]}
            tomorrowWorkData={tomorrowWorkData}
            nextBillNumber={nextBillNumber}
            nextQuotationNumber={nextQuotationNumber}
            setPayments={setPayments}
            setProjectExpenses={setProjectExpenses}
            setBills={setBills}
            setTomorrowWorkData={setTomorrowWorkData}
            setNextBillNumber={setNextBillNumber}
            setNextQuotationNumber={setNextQuotationNumber}
            pdfSettings={pdfSettings}
            onBack={() => setCurrentView("DASHBOARD")}
          />
        );
      case "ABOUT":
        return (
          <AboutView
            onBack={() => setCurrentView("DASHBOARD")}
            onContactClick={() => setCurrentView("CONTACT_INFO")}
          />
        );
      case "CLOUD_SYNC":
        if (!hasPermission("backupProtection", "view"))
          return (
            <DashboardView
              stats={stats}
              payments={payments}
              projectExpenses={projectExpenses}
              onDetails={() => setCurrentView("PAYMENT_HISTORY")}
            />
          );
        return (
          <CloudSyncView
            payments={payments}
            projectExpenses={projectExpenses}
            onBack={() => setCurrentView("DASHBOARD")}
          />
        );
      case "CONTACT_INFO":
        return <ContactInfoView onBack={() => setCurrentView("DASHBOARD")} />;
      case "TOMORROW_WORK":
        if (!hasPermission("tomorrowWork", "view"))
          return (
            <DashboardView
              stats={stats}
              payments={payments}
              projectExpenses={projectExpenses}
              onDetails={() => setCurrentView("PAYMENT_HISTORY")}
            />
          );
        return (
          <TomorrowWorkView
            rows={currentTomorrowWorkRows}
            setRows={setCurrentTomorrowWorkRows}
            manpowerSuggestions={manpowerSuggestions}
            setManpowerSuggestions={setManpowerSuggestions}
            projectSuggestions={projectSuggestions}
            setProjectSuggestions={setProjectSuggestions}
            addressSuggestions={addressSuggestions}
            setAddressSuggestions={setAddressSuggestions}
            workSuggestions={workSuggestions}
            setWorkSuggestions={setWorkSuggestions}
            date={tomorrowWorkDate}
            setDate={setTomorrowWorkDate}
            onBack={() => setCurrentView("DASHBOARD")}
            onViewHistory={() => setCurrentView("TOMORROW_WORK_HISTORY")}
            isAdmin={hasPermission("tomorrowWork", "edit")}
            isSuperAdmin={isSuperAdmin}
            onSave={async () => {
              const isDataEmpty = currentTomorrowWorkRows.every(
                (row) =>
                  !row.projectName.trim() &&
                  !row.projectAddress.trim() &&
                  !row.workDescription.trim() &&
                  row.manpowerList.length === 0 &&
                  !row.overtime.trim(),
              );

              if (isDataEmpty) {
                alert("Cannot save empty data to history.");
                return;
              }

              try {
                await updateTomorrowWorkData({
                  ...tomorrowWorkData,
                  [tomorrowWorkDate]: currentTomorrowWorkRows,
                });
                setCurrentView("TOMORROW_WORK_DETAILS");
              } catch (e) {
                // error handled in updateTomorrowWorkData
              }
            }}
          />
        );
      case "TOMORROW_WORK_DETAILS":
        return (
          <TomorrowWorkDetailsView
            rows={currentTomorrowWorkRows}
            date={tomorrowWorkDate}
            onBack={() => setCurrentView("TOMORROW_WORK")}
            isSuperAdmin={isSuperAdmin}
          />
        );
      case "ADD_DATA":
        if (!hasPermission("addData", "view"))
          return (
            <DashboardView
              stats={stats}
              payments={payments}
              projectExpenses={projectExpenses}
              onDetails={() => setCurrentView("PAYMENT_HISTORY")}
            />
          );
        return (
          <AddDataView
            onAddPayment={addPayment}
            onAddProject={addProjectExpense}
            onBack={() => setCurrentView("DASHBOARD")}
            payments={payments}
            projectExpenses={projectExpenses}
            projectList={projectList}
          />
        );
      case "TOMORROW_WORK_HISTORY":
        if (!hasPermission("tomorrowWork", "view"))
          return (
            <DashboardView
              stats={stats}
              payments={payments}
              projectExpenses={projectExpenses}
              onDetails={() => setCurrentView("PAYMENT_HISTORY")}
            />
          );
        return (
          <TomorrowWorkHistoryView
            data={tomorrowWorkData}
            onBack={() => setCurrentView("TOMORROW_WORK")}
            onSelectDate={(date) => {
              setTomorrowWorkDate(date);
              setCurrentView("TOMORROW_WORK");
            }}
            isAdmin={hasPermission("tomorrowWork", "edit")}
            onDeleteDate={async (date) => {
              const newData = { ...tomorrowWorkData };
              delete newData[date];
              await updateTomorrowWorkData(newData);
            }}
          />
        );
      case "BILL":
        if (!hasPermission("newBill", "view"))
          return (
            <DashboardView
              stats={stats}
              payments={payments}
              projectExpenses={projectExpenses}
              onDetails={() => setCurrentView("PAYMENT_HISTORY")}
            />
          );
        return (
          <BillView
            key={editingBill ? `bill-edit-${editingBill.id}` : 'bill-new'}
            type="BILL"
            nextNumber={nextBillNumber}
            initialBill={editingBill || undefined}
            pdfSettings={pdfSettings}
            onSave={async (bill) => {
              try {
                const exists = bills.some((b) => b.id === bill.id);
                if (exists) {
                  await updateDoc(doc(db, "bills", bill.id), bill as any);
                  setEditingBill(null);
                } else {
                  await setDoc(doc(db, "bills", bill.id), {
                    ...bill,
                    createdBy: user?.uid || null,
                    createdByEmail: user?.email || null,
                  });
                }
                setCurrentView("BILL_HISTORY");
              } catch (error: any) {
                console.error("Error saving bill:", error);
                alert(
                  "Failed to save bill. Error: " +
                    (error.message || String(error)),
                );
              }
            }}
            onBack={() => {
              setEditingBill(null);
              setCurrentView("DASHBOARD");
            }}
          />
        );
      case "QUOTATION":
        if (!hasPermission("newQuotation", "view"))
          return (
            <DashboardView
              stats={stats}
              payments={payments}
              projectExpenses={projectExpenses}
              onDetails={() => setCurrentView("PAYMENT_HISTORY")}
            />
          );
        return (
          <BillView
            key={editingBill ? `quotation-edit-${editingBill.id}` : 'quotation-new'}
            type="QUOTATION"
            nextNumber={nextQuotationNumber}
            initialBill={editingBill || undefined}
            pdfSettings={pdfSettings}
            onSave={async (bill) => {
              try {
                const exists = quotations.some((q) => q.id === bill.id);
                if (exists) {
                  await updateDoc(doc(db, "quotations", bill.id), bill as any);
                  setEditingBill(null);
                } else {
                  await setDoc(doc(db, "quotations", bill.id), {
                    ...bill,
                    createdBy: user?.uid || null,
                    createdByEmail: user?.email || null,
                  });
                }
                setCurrentView("BILL_HISTORY");
              } catch (error: any) {
                console.error("Error saving quotation:", error);
                alert(
                  "Failed to save quotation. Error: " +
                    (error.message || String(error)),
                );
              }
            }}
            onConvertToBill={handleConvertToBill}
            onBack={() => {
              setEditingBill(null);
              setCurrentView("DASHBOARD");
            }}
          />
        );
      case "BILL_HISTORY":
        if (!hasPermission("historyLogs", "view"))
          return (
            <DashboardView
              stats={stats}
              payments={payments}
              projectExpenses={projectExpenses}
              onDetails={() => setCurrentView("PAYMENT_HISTORY")}
            />
          );
        return (
          <BillHistoryView
            bills={[...bills, ...quotations]}
            onEdit={(bill) => {
              setEditingBill(bill);
              setCurrentView(bill.type === "BILL" ? "BILL" : "QUOTATION");
            }}
            onConvertToBill={handleConvertToBill}
            onBack={() => setCurrentView("DASHBOARD")}
            pdfSettings={pdfSettings}
            isAdmin={hasPermission("historyLogs", "edit")}
            isSuperAdmin={isSuperAdmin}
          />
        );
      case "PDF_SETTINGS":
        if (!hasPermission("pdfSettings", "view"))
          return (
            <DashboardView
              stats={stats}
              payments={payments}
              projectExpenses={projectExpenses}
              onDetails={() => setCurrentView("PAYMENT_HISTORY")}
            />
          );
        return (
          <PDFSettingsView
            settings={pdfSettings}
            onSave={updatePdfSettings}
            onBack={() => setCurrentView("DASHBOARD")}
          />
        );
      case "USERS":
        return isSuperAdmin ? (
          <UserManagementView onBack={() => setCurrentView("DASHBOARD")} />
        ) : (
          <DashboardView
            stats={stats}
            payments={payments}
            projectExpenses={projectExpenses}
            onDetails={() => setCurrentView("PAYMENT_HISTORY")}
          />
        );
      case "LIVE_LOCATIONS":
        return isSuperAdmin ? (
          <LiveLocationsView onBack={() => setCurrentView("DASHBOARD")} />
        ) : (
          <DashboardView
            stats={stats}
            payments={payments}
            projectExpenses={projectExpenses}
            onDetails={() => setCurrentView("PAYMENT_HISTORY")}
          />
        );
      case "MEETINGS":
        if (!hasPermission("meetings", "view"))
          return (
            <DashboardView
              stats={stats}
              payments={payments}
              projectExpenses={projectExpenses}
              onDetails={() => setCurrentView("PAYMENT_HISTORY")}
            />
          );
        return (
          <MeetingsView
            meetings={meetings}
            isAdmin={hasPermission("meetings", "edit")}
            isSuperAdmin={isSuperAdmin}
            onBack={() => setCurrentView("DASHBOARD")}
          />
        );
      default:
        return (
          <DashboardView
            stats={stats}
            payments={payments}
            projectExpenses={projectExpenses}
            onDetails={() => setCurrentView("PAYMENT_HISTORY")}
          />
        );
    }
  };

  return (
    <div className="h-screen bg-[#E8F0F8] text-[#1A237E] font-sans flex flex-col overflow-hidden">
      <LocationTracker user={user} />
      {/* Alarm Modal */}
      <AnimatePresence>
        {activeAlarm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[9999] flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden border border-fuchsia-100 p-6 flex flex-col items-center text-center"
            >
              <div className="w-16 h-16 bg-fuchsia-100 text-fuchsia-600 rounded-full flex items-center justify-center mb-4 animate-pulse">
                <BellRing className="w-8 h-8" />
              </div>
              <h2 className="text-2xl font-black text-slate-800 tracking-tight mb-2">
                Meeting Reminder!
              </h2>
              <p className="text-lg font-bold text-fuchsia-600 mb-1">
                {activeAlarm.clientName}
              </p>
              <div className="bg-slate-50 w-full p-4 rounded-xl border border-slate-100 my-4 text-left">
                <p className="text-sm font-semibold text-slate-500 mb-1 uppercase tracking-widest text-[10px]">
                  Agenda
                </p>
                <p className="text-slate-700">{activeAlarm.agenda}</p>
              </div>
              <button
                onClick={() => {
                  setActiveAlarm(null);
                  if (navigator.vibrate) navigator.vibrate(0);
                }}
                className="w-full py-3 bg-[#0D47A1] text-white font-bold rounded-xl shadow-md hover:bg-[#1565C0] transition-colors"
              >
                Dismiss
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sidebar Overlay */}
      <AnimatePresence>
        {isSidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSidebarOpen(false)}
              className="fixed inset-0 bg-black/40 z-[100]"
            />
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed top-0 left-0 bottom-0 w-72 bg-[#F8FAFC] z-[110] shadow-2xl flex flex-col"
            >
              {/* Sidebar Header with Gradient */}
              <div className="p-6 bg-gradient-to-br from-[#0D47A1] to-[#1A237E] text-white relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl" />
                <div className="absolute bottom-0 left-0 w-24 h-24 bg-blue-400/20 rounded-full -ml-12 -mb-12 blur-xl" />

                <div className="flex items-center gap-3 relative z-10">
                  <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shrink-0 shadow-lg">
                    <span className="text-xl font-black text-[#DC2626]">
                      AE
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <h2 className="font-bold text-lg leading-tight tracking-tight">
                      Altasmim Engineering
                    </h2>
                    <p className="text-blue-100 text-[10px] font-medium uppercase tracking-[0.2em] opacity-80">
                      Management System
                    </p>
                  </div>
                  <button
                    onClick={() => setIsSidebarOpen(false)}
                    className="ml-auto p-2 hover:bg-white/20 rounded-xl transition-all cursor-pointer active:scale-90"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Sidebar Menu Items */}
              <div className="flex-1 py-6 px-4 space-y-2 overflow-y-auto custom-scrollbar">
                <p className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-[0.15em] px-3 mb-3">
                  Navigation
                </p>
                {[
                  {
                    view: "PROFILE",
                    label: "User",
                    value: "My Profile",
                    icon: <User className="w-5 h-5" />,
                    bg: "bg-blue-50",
                    color: "text-blue-600",
                  },
                  ...(hasPermission("projectList", "view")
                    ? [
                        {
                          view: "PROJECT_LIST",
                          label: "Projects",
                          value: "Project List",
                          icon: <Briefcase className="w-5 h-5" />,
                          bg: "bg-teal-50",
                          color: "text-teal-600",
                        },
                      ]
                    : []),
                  ...(hasPermission("meetings", "view")
                    ? [
                        {
                          view: "MEETINGS",
                          label: "Schedules",
                          value: "Client Meetings",
                          icon: <CalendarClock className="w-5 h-5" />,
                          bg: "bg-fuchsia-50",
                          color: "text-fuchsia-600",
                        },
                      ]
                    : []),
                  ...(hasPermission("newBill", "view")
                    ? [
                        {
                          view: "BILL",
                          label: "Create",
                          value: "New Bill",
                          icon: <Receipt className="w-5 h-5" />,
                          bg: "bg-indigo-50",
                          color: "text-indigo-600",
                        },
                      ]
                    : []),
                  ...(hasPermission("newQuotation", "view")
                    ? [
                        {
                          view: "QUOTATION",
                          label: "Create",
                          value: "New Quotation",
                          icon: <FileText className="w-5 h-5" />,
                          bg: "bg-purple-50",
                          color: "text-purple-600",
                        },
                      ]
                    : []),
                  ...(hasPermission("historyLogs", "view")
                    ? [
                        {
                          view: "BILL_HISTORY",
                          label: "Records",
                          value: "History & Logs",
                          icon: <History className="w-5 h-5" />,
                          bg: "bg-amber-50",
                          color: "text-amber-600",
                        },
                      ]
                    : []),
                  ...(hasPermission("pdfSettings", "view")
                    ? [
                        {
                          view: "PDF_SETTINGS",
                          label: "Custom",
                          value: "PDF Settings",
                          icon: <Printer className="w-5 h-5" />,
                          bg: "bg-orange-50",
                          color: "text-orange-600",
                        },
                      ]
                    : []),
                  ...(hasPermission("payments", "view")
                    ? [
                        {
                          view: "EMPLOYEE_TOTALS",
                          label: "Payments",
                          value: "Employee Details",
                          icon: <TrendingUp className="w-5 h-5" />,
                          bg: "bg-green-50",
                          color: "text-green-600",
                        },
                      ]
                    : []),
                  ...(hasPermission("exportBackup", "view")
                    ? [
                        {
                          view: "EXPORT",
                          label: "Data",
                          value: "Export & Backup",
                          icon: <Download className="w-5 h-5" />,
                          bg: "bg-slate-50",
                          color: "text-slate-600",
                        },
                      ]
                    : []),
                  ...(hasPermission("backupProtection", "view")
                    ? [
                        {
                          view: "CLOUD_SYNC",
                          label: "Cloud",
                          value: "Backup & Protection",
                          icon: <ShieldCheck className="w-5 h-5" />,
                          bg: "bg-sky-50",
                          color: "text-sky-600",
                        },
                      ]
                    : []),
                  ...(isSuperAdmin
                    ? [
                        {
                          view: "USERS",
                          label: "Admin",
                          value: "User Management",
                          icon: <UsersIcon className="w-5 h-5" />,
                          bg: "bg-rose-50",
                          color: "text-rose-600",
                        },
                        {
                          view: "LIVE_LOCATIONS",
                          label: "Locations",
                          value: "Live Activity",
                          icon: <MapPin className="w-5 h-5" />,
                          bg: "bg-purple-50",
                          color: "text-purple-600",
                        },
                      ]
                    : []),
                  {
                    view: "ABOUT",
                    label: "Developer",
                    value: "About Me",
                    icon: <Info className="w-5 h-5" />,
                    bg: "bg-slate-50",
                    color: "text-slate-600",
                  },
                  {
                    view: "CONTACT_INFO",
                    label: "Support",
                    value: "Contact Details",
                    icon: <Phone className="w-5 h-5" />,
                    bg: "bg-rose-50",
                    color: "text-rose-600",
                  },
                ].map((item, index) => (
                  <motion.button
                    key={index}
                    initial={{ opacity: 0, x: -15 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{
                      delay: index * 0.04,
                      type: "spring",
                      stiffness: 100,
                    }}
                    onClick={() => {
                      setCurrentView(item.view as View);
                      setIsSidebarOpen(false);
                    }}
                    className={`w-full flex items-center gap-3.5 p-2.5 rounded-xl transition-all active:scale-[0.97] group relative overflow-hidden text-left cursor-pointer ${
                      currentView === item.view
                        ? "bg-white shadow-md border border-blue-100"
                        : "hover:bg-white/60 border border-transparent hover:border-slate-200"
                    }`}
                  >
                    <div
                      className={`w-10 h-10 ${item.bg} ${item.color} rounded-lg flex items-center justify-center group-hover:scale-105 transition-transform duration-300 shadow-sm`}
                    >
                      {item.icon}
                    </div>
                    <div className="flex-1">
                      <p
                        className={`text-[8px] font-bold uppercase tracking-wider mb-0.5 ${currentView === item.view ? "text-blue-500" : "text-slate-400"}`}
                      >
                        {item.label}
                      </p>
                      <p
                        className={`text-[13px] font-bold transition-colors ${currentView === item.view ? "text-[#0D47A1]" : "text-slate-600 group-hover:text-slate-900"}`}
                      >
                        {item.value}
                      </p>
                    </div>
                    {currentView === item.view && (
                      <div className="w-1.5 h-6 bg-[#0D47A1] rounded-full absolute right-0" />
                    )}
                  </motion.button>
                ))}
              </div>

              {/* Sidebar Footer */}
              <div className="p-6 border-t border-slate-100 bg-slate-50/50">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-[#0D47A1] overflow-hidden flex items-center justify-center text-white font-bold shadow-sm">
                    {user?.photoURL ? (
                      <img
                        src={user.photoURL}
                        alt=""
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      user?.displayName?.charAt(0) || "U"
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-[#1E293B] truncate">
                      {user?.displayName}
                    </p>
                    <p className="text-[10px] font-medium text-[#64748B] uppercase tracking-wider flex items-center gap-1">
                      {isSuperAdmin ? (
                        <ShieldCheck className="w-3 h-3 text-rose-500" />
                      ) : isAdmin ? (
                        <ShieldAlert className="w-3 h-3 text-amber-500" />
                      ) : (
                        <Shield className="w-3 h-3 text-blue-500" />
                      )}
                      {profile?.role.replace("_", " ")}
                    </p>
                  </div>
                </div>
                <button
                  onClick={async () => {
                    if (window.confirm("This will clear app cache and reload to get the latest update. Continue?")) {
                      if ("caches" in window) {
                        const names = await caches.keys();
                        await Promise.all(names.map(name => caches.delete(name)));
                      }
                      if ("serviceWorker" in navigator) {
                         const registrations = await navigator.serviceWorker.getRegistrations();
                         await Promise.all(registrations.map(r => r.unregister()));
                      }
                      localStorage.clear();
                      window.location.reload();
                    }
                  }}
                  className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-xl bg-blue-50 text-[#0D47A1] font-bold text-[10px] hover:bg-blue-100 transition-all mb-2"
                >
                  <RefreshCw className="w-3 h-3" />
                  FORCE REFRESH / UPDATE
                </button>
                <button
                  onClick={logout}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-white border border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-50 hover:text-rose-600 hover:border-rose-200 transition-all active:scale-[0.98] cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Header */}
      <header className="bg-white p-4 flex items-center justify-between shadow-sm border-b border-[#B0BEC5]">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="p-1 hover:bg-[#F5F5F5] rounded-full transition-colors cursor-pointer"
          >
            <Menu className="w-6 h-6 text-[#1A237E]" />
          </button>
          <h1 className="text-lg font-bold">
            {currentView === "TOMORROW_WORK"
              ? "WORK SCHEDULE"
              : "Altasmim Engineering"}
          </h1>
          {updateAvailable && (
            <button
              onClick={() => {
                if ("serviceWorker" in navigator) {
                  navigator.serviceWorker.getRegistration().then((reg) => {
                    if (reg && reg.waiting) {
                      reg.waiting.postMessage({ type: "SKIP_WAITING" });
                    } else {
                      window.location.reload();
                    }
                  });
                } else {
                  window.location.reload();
                }
              }}
              className="ml-2 px-2 py-1 bg-red-600 text-white text-[9px] font-black rounded-full animate-bounce shadow-lg flex items-center gap-1"
            >
              <RefreshCw className="w-2.5 h-2.5" /> UPDATE
            </button>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main
        ref={mainRef}
        onScroll={handleScroll}
        className="p-4 max-w-2xl mx-auto flex-1 overflow-y-auto w-full relative"
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={currentView}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {renderView()}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Floating Action Button */}
      {currentView === "DASHBOARD" && hasPermission("addData", "edit") && (
        <button
          onClick={() => setCurrentView("ADD_DATA")}
          className="fixed bottom-32 right-6 w-14 h-14 bg-[#0D47A1] text-white rounded-lg shadow-lg flex flex-col items-center justify-center hover:bg-[#1565C0] hover:scale-110 active:scale-95 transition-all cursor-pointer z-50"
        >
          <Plus className="w-6 h-6" />
          <span className="text-[10px] font-bold">Add Data</span>
        </button>
      )}

      {/* Global Footer */}
      <footer className="bg-white border-t border-[#B0BEC5] shadow-[0_-2px_10px_rgba(0,0,0,0.05)] mt-auto mb-24 flex flex-col items-center justify-center pt-3 pb-4 space-y-2">
        <div className="flex flex-row items-center justify-center gap-4">
          <a
            href="https://www.al-tasmim.net"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-bold text-[#0D47A1] hover:underline cursor-pointer"
          >
            www.al-tasmim.net
          </a>
          <span className="text-[#B0BEC5] text-sm leading-none">|</span>
          <a
            href="mailto:Bijoy.mm112@gmail.com"
            className="text-xs text-[#0D47A1] hover:underline font-bold"
          >
            Bijoy.mm112@gmail.com
          </a>
        </div>
        <div className="text-[10px] text-[#78909C] font-bold uppercase tracking-widest">
          {/* Developer credit removed from global footer as requested */}
        </div>
      </footer>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#B0BEC5] flex justify-around items-center pt-2 pb-6 px-2 z-40 shadow-[0_-4px_10px_rgba(0,0,0,0.05)]">
        {hasPermission("tomorrowWork", "view") && (
          <NavButton
            active={currentView === "TOMORROW_WORK"}
            onClick={() => setCurrentView("TOMORROW_WORK")}
            icon={<Calendar className="w-5 h-5" />}
            label="WORK SCHEDULE"
            color="#ED7D31"
          />
        )}
        {hasPermission("payments", "view") && (
          <NavButton
            active={currentView === "PAYMENT_HISTORY"}
            onClick={() => setCurrentView("PAYMENT_HISTORY")}
            icon={<History className="w-5 h-5" />}
            label="PAYMENT HISTORY"
            color="#2E7D32"
          />
        )}
        {hasPermission("dashboard", "view") && (
          <NavButton
            active={currentView === "DASHBOARD"}
            onClick={() => setCurrentView("DASHBOARD")}
            icon={<LayoutDashboard className="w-5 h-5" />}
            label="HOME"
            color="#0D47A1"
          />
        )}
        {hasPermission("projects", "view") && (
          <NavButton
            active={currentView === "PROJECT_SUMMARY"}
            onClick={() => setCurrentView("PROJECT_SUMMARY")}
            icon={<BarChart3 className="w-5 h-5" />}
            label="PROJECT SUMMARY"
            color="#7B1FA2"
          />
        )}
        {hasPermission("revenue", "view") && (
          <NavButton
            active={currentView === "REVENUE"}
            onClick={() => setCurrentView("REVENUE")}
            icon={<TrendingUp className="w-5 h-5" />}
            label="REVENUE"
            color="#00897B"
          />
        )}
        <NavButton
          active={currentView === "PROFILE"}
          onClick={() => setCurrentView("PROFILE")}
          icon={<User className="w-5 h-5" />}
          label="PROFILE"
          color="#FF9900"
        />
      </nav>
    </div>
  );
}

function NavButton({
  active,
  onClick,
  icon,
  label,
  color = "#0D47A1",
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  color?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center gap-1 p-2 transition-all duration-200 cursor-pointer rounded-lg ${
        active ? "scale-105" : "text-[#78909C] hover:bg-[#F5F5F5]"
      }`}
      style={{
        color: active ? color : undefined,
        backgroundColor: active ? `${color}15` : undefined, // 15 is ~8% opacity in hex
      }}
    >
      <div style={{ color: active ? color : undefined }}>{icon}</div>
      <span className="text-[9px] font-bold text-center leading-tight">
        {label}
      </span>
    </button>
  );
}

// --- Views ---

function DashboardView({
  stats,
  payments,
  projectExpenses,
  onDetails,
}: {
  stats: { employeeCost: number; materialsCost: number; totalExpense: number };
  payments: EmployeePayment[];
  projectExpenses: ProjectExpense[];
  onDetails: () => void;
}) {
  const { isSuperAdmin, profile, user } = useAuth();
  const COLORS = ["#0D47A1", "#2E7D32", "#FFB300", "#ED7D31", "#7B1FA2", "#00897B"];

  const projectTotals = useMemo(() => {
    const totals: Record<string, { name: string; cost: number }> = {};
    payments.forEach((p) => {
      const key = p.projectName.trim().toLowerCase();
      if (!totals[key]) totals[key] = { name: p.projectName, cost: 0 };
      totals[key].cost += p.payment + (p.transport || 0);
    });
    projectExpenses.forEach((p) => {
      const key = p.projectName.trim().toLowerCase();
      if (!totals[key]) totals[key] = { name: p.projectName, cost: 0 };
      totals[key].cost += p.materialsCost + p.transportCost + p.othersCost;
    });
    return Object.values(totals).sort((a, b) => b.cost - a.cost).slice(0, 5);
  }, [payments, projectExpenses]);

  const pieData = useMemo(() => {
    const empPayment = payments.reduce((sum, p) => sum + p.payment, 0);
    const empTransport = payments.reduce((sum, p) => sum + (p.transport || 0), 0);
    const materials = projectExpenses.reduce((sum, p) => sum + p.materialsCost, 0);
    const projTransport = projectExpenses.reduce((sum, p) => sum + p.transportCost, 0);
    const others = projectExpenses.reduce((sum, p) => sum + p.othersCost, 0);

    return [
      { name: "Employee Payments", value: empPayment },
      { name: "Employee Transport", value: empTransport },
      { name: "Materials", value: materials },
      { name: "Others", value: others },
      { name: "Project Transport", value: projTransport },
    ]
      .filter((d) => d.value > 0)
      .map((d) => ({
        ...d,
        name: `${d.name} (${formatCurrency(d.value)})`,
      }));
  }, [payments, projectExpenses]);

  const monthlyData = useMemo(() => {
    const months: Record<string, number> = {};
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    const processItem = (item: { timestamp: string; cost: number }) => {
      try {
        const datePart = item.timestamp.split(",")[0];
        const parts = datePart.split("/");
        if (parts.length === 3) {
          const sortKey = `${parts[2].trim()}-${parts[1].padStart(2, "0")}`;
          months[sortKey] = (months[sortKey] || 0) + item.cost;
        }
      } catch (e) {}
    };

    payments.forEach((p) => processItem({ timestamp: p.timestamp, cost: p.payment + (p.transport || 0) }));
    projectExpenses.forEach((p) => processItem({ timestamp: p.timestamp, cost: p.materialsCost + p.transportCost + p.othersCost }));

    return Object.entries(months)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([key, total]) => {
        const [year, month] = key.split("-");
        return {
          month: `${monthNames[parseInt(month) - 1]} ${year}`,
          total,
        };
      })
      .slice(-6);
  }, [payments, projectExpenses]);

  const recentGlobalEntries = useMemo(() => {
    const parseTs = (ts: string) => {
      if (!ts) return 0;
      const match = ts.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
      return match ? new Date(`${match[3]}-${match[2]}-${match[1]}`).getTime() : 0;
    };
    const combined = [
      ...payments.map(p => ({ type: 'Payment', date: p.timestamp ? p.timestamp.split(',')[0] : "", amount: p.payment + (p.transport || 0), projectName: p.projectName, name: p.employeeName, timestamp: p.timestamp || "" })),
      ...projectExpenses.map(p => ({ type: 'Expense', date: p.timestamp ? p.timestamp.split(',')[0] : "", amount: p.materialsCost + p.transportCost + p.othersCost, projectName: p.projectName, name: p.materialsName, timestamp: p.timestamp || "" }))
    ].sort((a,b) => parseTs(b.timestamp) - parseTs(a.timestamp)).slice(0, 10); // Show max 10 recent global entries
    return combined;
  }, [payments, projectExpenses]);

  return (
    <div className="space-y-6 pb-10">
      <h2 className="text-xl font-bold border-b-2 border-[#0D47A1] inline-block pb-1 text-[#FF9900]">
        Global Dashboard
      </h2>

      {(profile?.role === "admin" || profile?.role === "super_admin" || user?.email === "bijoymahmudmunna@gmail.com") && (
        <div className="grid grid-cols-1 gap-4">
          <div className="bg-white rounded-2xl p-6 shadow-xl border border-[#B0BEC5] text-center relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-[#0D47A1]/10" />
            <p className="text-[#FF9900] font-bold mb-2 flex items-center justify-center gap-2">
              ---------- Total Global Expense ----------
            </p>
            <h3 className="text-3xl font-bold text-[#2E7D32] mb-4">
              {formatCurrency(stats.totalExpense)}
            </h3>
            <div className="grid grid-cols-2 gap-4 border-t border-[#B0BEC5]/30 pt-4">
              <div className="text-left">
                <p className="text-[10px] text-[#78909C] font-bold uppercase">Employee Cost</p>
                <p className="text-sm font-bold text-[#1A237E]">{formatCurrency(stats.employeeCost)}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-[#78909C] font-bold uppercase">Materials Cost</p>
                <p className="text-sm font-bold text-[#1A237E]">{formatCurrency(stats.materialsCost)}</p>
              </div>
            </div>

            <div className="mt-6">
              <div className="overflow-hidden rounded-lg border border-[#B0BEC5]/30">
                <table className="w-full text-[10px] text-left">
                  <tbody>
                    {projectTotals.map((p, i) => (
                      <tr key={p.name} className={i % 2 === 0 ? "bg-white" : "bg-[#F5F9FD]"}>
                        <td className="p-1.5 border-r border-[#B0BEC5]/20 truncate max-w-[120px]">{p.name}</td>
                        <td className="p-1.5 font-bold text-right">{formatCurrency(p.cost)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <button onClick={onDetails} className="mt-4 text-[#0D47A1] font-bold text-xs hover:underline cursor-pointer">
              View All Details
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6">
        <div className="bg-white rounded-2xl p-4 shadow-lg border border-[#B0BEC5]">
          <h3 className="text-sm font-bold text-[#0D47A1] mb-4 flex items-center gap-2">
            <PieChartIcon className="w-4 h-4" /> Expense Distribution
          </h3>
          <div className="h-80 w-full">
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="45%" innerRadius={50} outerRadius={75} paddingAngle={5} dataKey="value">
                    {pieData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                  <Legend verticalAlign="bottom" align="left" wrapperStyle={{ paddingTop: "5px", fontSize: "10px" }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-[#78909C] text-sm">No data</div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 shadow-lg border border-[#B0BEC5]">
          <h3 className="text-sm font-bold text-[#0D47A1] mb-4 flex items-center gap-2">
            <BarChart3 className="w-4 h-4" /> Monthly Global Expenses
          </h3>
          <div className="h-64 w-full">
            {monthlyData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyData}>
                  <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} tickFormatter={(val) => val >= 1000 ? `${val / 1000}k` : val} />
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                  <Bar dataKey="total" fill="#0D47A1" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-[#78909C] text-sm">No data</div>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-4 shadow-lg border border-[#B0BEC5]">
        <h3 className="text-sm font-bold text-[#0D47A1] mb-4">Recent Global Entries</h3>
        <div className="overflow-hidden rounded-lg border border-[#B0BEC5] bg-white">
          <table className="w-full text-[10px] text-left">
            <thead className="bg-[#0D47A1] text-white">
              <tr>
                <th className="p-2">Date</th>
                <th className="p-2">Name</th>
                <th className="p-2">Project</th>
                <th className="p-2 text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {recentGlobalEntries.map((e, i) => (
                <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-blue-50/30"}>
                  <td className="p-2 border-r border-slate-100">{e.timestamp.split(',')[0]}</td>
                  <td className="p-2 border-r border-slate-100 truncate max-w-[80px]">
                    {e.name || '-'}
                    <span className={`block text-[8px] mt-0.5 text-slate-500`}>
                      {e.type}
                    </span>
                  </td>
                  <td className="p-2 border-r border-slate-100 truncate max-w-[80px] text-slate-500">
                    {e.projectName || '-'}
                  </td>
                  <td className="p-2 font-bold text-right text-gray-800">
                    {formatCurrency(e.amount)}
                  </td>
                </tr>
              ))}
              {recentGlobalEntries.length === 0 && (
                <tr>
                  <td colSpan={4} className="p-4 text-center text-gray-500">No recent entries</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}

function ProfileDashboardView({
  payments,
  projectExpenses,
  personalReceivedMoney,
  personalGivenMoney,
  onAddPersonalReceivedMoney,
  onUpdatePersonalReceivedMoney,
  onDeletePersonalReceivedMoney,
  onAddPersonalGivenMoney,
  onUpdatePersonalGivenMoney,
  onDeletePersonalGivenMoney,
}: {
  payments: EmployeePayment[];
  projectExpenses: ProjectExpense[];
  personalReceivedMoney: PersonalReceivedMoney[];
  personalGivenMoney: PersonalGivenMoney[];
  onAddPersonalReceivedMoney: (m: Omit<PersonalReceivedMoney, "id">) => Promise<void>;
  onUpdatePersonalReceivedMoney: (m: PersonalReceivedMoney) => Promise<void>;
  onDeletePersonalReceivedMoney: (id: string) => Promise<void>;
  onAddPersonalGivenMoney: (m: Omit<PersonalGivenMoney, "id">) => Promise<void>;
  onUpdatePersonalGivenMoney: (m: PersonalGivenMoney) => Promise<void>;
  onDeletePersonalGivenMoney: (id: string) => Promise<void>;
}) {
  const { profile, user } = useAuth();
  
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [viewingEmail, setViewingEmail] = useState<string>("");

  useEffect(() => {
    if (profile?.role === "super_admin" || user?.email === "bijoymahmudmunna@gmail.com") {
      const q = query(collection(db, "users"));
      const unsubscribe = onSnapshot(q, (snap) => {
        const usersList = snap.docs.map((doc) => doc.data() as UserProfile);
        setUsers(usersList);
      });
      return unsubscribe;
    }
  }, [profile, user]);

  const targetEmail = viewingEmail || profile?.email;
  const targetUser = users.find(u => u.email === targetEmail) || profile;

  const [showReceivedForm, setShowReceivedForm] = useState(false);
  const [editingReceivedMoney, setEditingReceivedMoney] = useState<PersonalReceivedMoney | null>(null);
  const [receivedForm, setReceivedForm] = useState({
    date: new Date().toISOString().split("T")[0],
    note: "",
    amount: "",
    method: "Cash",
  });

  const [showGivenForm, setShowGivenForm] = useState(false);
  const [editingGivenMoney, setEditingGivenMoney] = useState<PersonalGivenMoney | null>(null);
  const [givenForm, setGivenForm] = useState({
    date: new Date().toISOString().split("T")[0],
    name: "",
    projectName: "",
    amount: "",
  });

  const handleEditReceived = (money: PersonalReceivedMoney) => {
    let [d, m, y] = ["", "", ""];
    if (money.date && money.date.includes("/")) {
      [d, m, y] = money.date.split("/");
    }
    setEditingReceivedMoney(money);
    setReceivedForm({
      date: y && m && d ? `${y}-${m}-${d}` : new Date().toISOString().split("T")[0],
      note: money.note || "",
      amount: money.amount.toString(),
      method: money.method || "Cash",
    });
    setShowReceivedForm(true);
    setShowGivenForm(false);
  };

  const handleEditGiven = (money: PersonalGivenMoney) => {
    let [d, m, y] = ["", "", ""];
    if (money.date && money.date.includes("/")) {
      [d, m, y] = money.date.split("/");
    }
    setEditingGivenMoney(money);
    setGivenForm({
      date: y && m && d ? `${y}-${m}-${d}` : new Date().toISOString().split("T")[0],
      name: money.name || "",
      projectName: money.projectName || "",
      amount: money.amount.toString(),
    });
    setShowGivenForm(true);
    setShowReceivedForm(false);
  };

  const handleSaveReceived = async () => {
    if (!receivedForm.amount || !receivedForm.date) return;
    try {
      const [y, m, d] = receivedForm.date.split("-");
      const formattedDate = `${d}/${m}/${y}`;
      if (editingReceivedMoney) {
        await onUpdatePersonalReceivedMoney({
          ...editingReceivedMoney,
          date: formattedDate,
          amount: parseFloat(receivedForm.amount),
          note: receivedForm.note,
          method: receivedForm.method,
        });
        alert("Money received updated successfully.");
      } else {
        await onAddPersonalReceivedMoney({
          date: formattedDate,
          amount: parseFloat(receivedForm.amount),
          note: receivedForm.note,
          method: receivedForm.method,
          createdByEmail: targetEmail || "",
        });
        alert("Money received added successfully.");
      }
      setShowReceivedForm(false);
      setEditingReceivedMoney(null);
      setReceivedForm({ date: new Date().toISOString().split("T")[0], note: "", amount: "", method: "Cash" });
    } catch (e) {
      alert("Failed to save money received.");
    }
  };

  const handleSaveGiven = async () => {
    if (!givenForm.amount || !givenForm.date || !givenForm.name) return;
    try {
      const [y, m, d] = givenForm.date.split("-");
      const formattedDate = `${d}/${m}/${y}`;
      if (editingGivenMoney) {
        await onUpdatePersonalGivenMoney({
          ...editingGivenMoney,
          date: formattedDate,
          amount: parseFloat(givenForm.amount),
          name: givenForm.name,
          projectName: givenForm.projectName,
        });
        alert("Given money updated successfully.");
      } else {
        await onAddPersonalGivenMoney({
          date: formattedDate,
          amount: parseFloat(givenForm.amount),
          name: givenForm.name,
          projectName: givenForm.projectName,
          createdByEmail: targetEmail || "",
        });
        alert("Given money added successfully.");
      }
      setShowGivenForm(false);
      setEditingGivenMoney(null);
      setGivenForm({ date: new Date().toISOString().split("T")[0], name: "", projectName: "", amount: "" });
    } catch (e) {
      alert("Failed to save given money.");
    }
  };

  const userPayments = useMemo(() => payments.filter((p) => p.createdByEmail === targetEmail), [payments, targetEmail]);
  const userExpenses = useMemo(() => projectExpenses.filter((p) => p.createdByEmail === targetEmail), [projectExpenses, targetEmail]);
  const userCollections = useMemo(() => personalReceivedMoney.filter((c) => c.createdByEmail === targetEmail), [personalReceivedMoney, targetEmail]);
  const userGiven = useMemo(() => personalGivenMoney.filter((c) => c.createdByEmail === targetEmail), [personalGivenMoney, targetEmail]);

  const userStats = useMemo(() => {
    const totalCostPayments = userPayments.reduce((sum, p) => sum + p.payment + (p.transport || 0), 0);
    const totalCostExpenses = userExpenses.reduce((sum, p) => sum + p.materialsCost + p.transportCost + p.othersCost, 0);
    const totalGiven = userGiven.reduce((sum, g) => sum + g.amount, 0);
    
    // Total Cost should include the money given to others as well!
    const totalCost = totalCostPayments + totalCostExpenses + totalGiven;
    const totalReceived = userCollections.reduce((sum, c) => sum + c.amount, 0);
    const inHand = totalReceived - totalCost;

    return { totalReceived, totalCost, inHand };
  }, [userPayments, userExpenses, userCollections, userGiven]);

  const recentEntries = useMemo(() => {
    const parseTs = (ts: string) => {
      if (!ts) return 0;
      const match = ts.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
      return match ? new Date(`${match[3]}-${match[2]}-${match[1]}`).getTime() : 0;
    };
    const combined = [
      ...userPayments.map(p => ({ ...p, type: 'Payment', amount: p.payment + (p.transport || 0), name: p.employeeName, timestamp: p.timestamp || p.date })),
      ...userExpenses.map(p => ({ ...p, type: 'Expense', amount: p.materialsCost + p.transportCost + p.othersCost, name: p.materialsName || 'Expense', timestamp: p.timestamp || p.date })),
      ...userCollections.map(p => ({ ...p, type: 'Received', amount: p.amount, name: p.method || 'Cash', timestamp: p.date })),
      ...userGiven.map(p => ({ ...p, type: 'Given', amount: p.amount, name: p.name, timestamp: p.date }))
    ].sort((a,b) => parseTs(b.timestamp) - parseTs(a.timestamp));
    return combined;
  }, [userPayments, userExpenses, userCollections, userGiven]);

  return (
    <div className="space-y-6 pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b-2 border-[#0D47A1] pb-2 gap-4">
        <div className="flex items-center gap-4">
          {targetUser?.photoURL && <img src={targetUser.photoURL} className="w-12 h-12 rounded-full border-2 border-blue-100 shadow-sm" alt="Profile" />}
          <div>
            <h2 className="text-xl font-bold text-[#FF9900]">{targetUser?.displayName || 'User Profile'}</h2>
            <p className="text-[10px] text-slate-500 font-medium">{targetEmail}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {(profile?.role === "super_admin" || user?.email === "bijoymahmudmunna@gmail.com") && users.length > 0 && (
            <select
              value={viewingEmail || ""}
              onChange={(e) => {
                setViewingEmail(e.target.value);
                setShowReceivedForm(false);
                setEditingReceivedMoney(null);
              }}
              className="text-xs bg-white border border-gray-300 rounded p-1.5 focus:ring-[#0D47A1] focus:border-[#0D47A1]"
            >
              <option value="">My Profile</option>
              {users.map((u) => (
                <option key={u.uid} value={u.email}>{u.displayName || u.email}</option>
              ))}
            </select>
          )}
          {(profile?.role === "admin" || profile?.role === "super_admin" || user?.email === "bijoymahmudmunna@gmail.com") && (
            <button
              onClick={() => {
                setEditingGivenMoney(null);
                setGivenForm({ date: new Date().toISOString().split("T")[0], name: "", projectName: "", amount: "" });
                setShowGivenForm(!showGivenForm);
              }}
              className="flex items-center gap-2 bg-[#D32F2F] text-white px-3 py-1.5 rounded-lg font-bold text-xs shadow hover:bg-red-700 transition-colors"
            >
              <TrendingUp className="w-4 h-4 rotate-180" />
              Given Money
            </button>
          )}
          <button
            onClick={() => {
              setEditingReceivedMoney(null);
              setReceivedForm({ date: new Date().toISOString().split("T")[0], note: "", amount: "", method: "Cash" });
              setShowReceivedForm(!showReceivedForm);
            }}
            className="flex items-center gap-2 bg-[#2E7D32] text-white px-3 py-1.5 rounded-lg font-bold text-xs shadow hover:bg-green-700 transition-colors"
          >
            <TrendingUp className="w-4 h-4" />
            Receive Money
          </button>
        </div>
      </div>

      {showReceivedForm && (
        <div className="bg-[#F5F9FD] p-4 rounded-xl shadow-inner border border-blue-100 flex flex-col gap-3">
          <h3 className="text-sm font-bold text-[#0D47A1]">Record Received Money</h3>
          <input
            type="date"
            value={receivedForm.date}
            onChange={(e) => setReceivedForm({ ...receivedForm, date: e.target.value })}
            className="w-full text-sm border-gray-300 rounded-lg p-2 focus:ring-[#0D47A1] focus:border-[#0D47A1]"
          />
          <input
            type="text"
            placeholder="Note (Optional)"
            value={receivedForm.note}
            onChange={(e) => setReceivedForm({ ...receivedForm, note: e.target.value })}
            className="w-full text-sm border-gray-300 rounded-lg p-2 focus:ring-[#0D47A1] focus:border-[#0D47A1]"
          />
          <input
            type="number"
            placeholder="Amount"
            value={receivedForm.amount}
            onChange={(e) => setReceivedForm({ ...receivedForm, amount: e.target.value })}
            className="w-full text-sm border-gray-300 rounded-lg p-2 focus:ring-[#0D47A1] focus:border-[#0D47A1]"
          />
          <select
            value={receivedForm.method}
            onChange={(e) => setReceivedForm({ ...receivedForm, method: e.target.value })}
            className="w-full text-sm border-gray-300 rounded-lg p-2 focus:ring-[#0D47A1] focus:border-[#0D47A1]"
          >
            <option value="Cash">Cash</option>
            <option value="bKash">bKash</option>
            <option value="Bank">Bank</option>
            <option value="Others">Others</option>
          </select>
          <div className="flex gap-2">
            <button
              onClick={handleSaveReceived}
              disabled={!receivedForm.amount || !receivedForm.date}
              className="flex-1 bg-[#0D47A1] text-white p-2 rounded-lg font-bold hover:bg-blue-800 transition-colors disabled:opacity-50"
            >
              {editingReceivedMoney ? "Update Received Money" : "Save Received Money"}
            </button>
            <button
              onClick={() => {
                setShowReceivedForm(false);
                setEditingReceivedMoney(null);
                setReceivedForm({ date: new Date().toISOString().split("T")[0], note: "", amount: "", method: "Cash" });
              }}
              className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors font-bold"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {showGivenForm && (
        <div className="bg-red-50 p-4 rounded-xl shadow-inner border border-red-100 flex flex-col gap-3">
          <h3 className="text-sm font-bold text-red-800">Record Given Money</h3>
          <input
            type="date"
            value={givenForm.date}
            onChange={(e) => setGivenForm({ ...givenForm, date: e.target.value })}
            className="w-full text-sm border-gray-300 rounded-lg p-2 focus:ring-red-600 focus:border-red-600"
          />
          <input
            type="text"
            placeholder="Name"
            value={givenForm.name}
            onChange={(e) => setGivenForm({ ...givenForm, name: e.target.value })}
            className="w-full text-sm border-gray-300 rounded-lg p-2 focus:ring-red-600 focus:border-red-600"
          />
          <input
            type="text"
            placeholder="Project (Optional)"
            value={givenForm.projectName}
            onChange={(e) => setGivenForm({ ...givenForm, projectName: e.target.value })}
            className="w-full text-sm border-gray-300 rounded-lg p-2 focus:ring-red-600 focus:border-red-600"
          />
          <input
            type="number"
            placeholder="Amount"
            value={givenForm.amount}
            onChange={(e) => setGivenForm({ ...givenForm, amount: e.target.value })}
            className="w-full text-sm border-gray-300 rounded-lg p-2 focus:ring-red-600 focus:border-red-600"
          />
          <div className="flex gap-2">
            <button
              onClick={handleSaveGiven}
              disabled={!givenForm.amount || !givenForm.date || !givenForm.name}
              className="flex-1 bg-[#D32F2F] text-white p-2 rounded-lg font-bold hover:bg-red-800 transition-colors disabled:opacity-50"
            >
              {editingGivenMoney ? "Update Given Money" : "Save Given Money"}
            </button>
            <button
              onClick={() => {
                setShowGivenForm(false);
                setEditingGivenMoney(null);
                setGivenForm({ date: new Date().toISOString().split("T")[0], name: "", projectName: "", amount: "" });
              }}
              className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors font-bold"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white p-4 rounded-xl shadow-sm border border-blue-100 text-center">
          <TrendingUp className="w-5 h-5 text-green-500 mx-auto mb-1" />
          <p className="text-[10px] font-bold text-slate-400 uppercase">Received</p>
          <p className="text-sm font-black text-slate-800">{formatCurrency(userStats.totalReceived)}</p>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-red-100 text-center">
          <TrendingUp className="w-5 h-5 text-red-500 mx-auto mb-1 rotate-180" />
          <p className="text-[10px] font-bold text-slate-400 uppercase">Total Cost</p>
          <p className="text-sm font-black text-slate-800">{formatCurrency(userStats.totalCost)}</p>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-green-100 text-center">
          <LayoutDashboard className="w-5 h-5 text-blue-500 mx-auto mb-1" />
          <p className="text-[10px] font-bold text-slate-400 uppercase">In Hand</p>
          <p className={`text-sm font-black ${userStats.inHand >= 0 ? "text-green-600" : "text-red-600"}`}>{formatCurrency(userStats.inHand)}</p>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-sm font-bold text-[#0D47A1] underline">Received Money History</h3>
        <div className="overflow-hidden rounded-lg border border-[#B0BEC5] bg-white">
          <table className="w-full text-[10px] text-left">
            <thead className="bg-[#2E7D32] text-white">
              <tr>
                <th className="p-2">Date</th>
                <th className="p-2">Name</th>
                <th className="p-2 text-right">Amount</th>
                <th className="p-2 text-center">By</th>
                <th className="p-2 text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {userCollections.map((m, i) => (
                <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-green-50/30"}>
                  <td className="p-2 border-r border-slate-100">{m.date}</td>
                  <td className="p-2 border-r border-slate-100 truncate max-w-[120px]">{m.note || '-'}</td>
                  <td className="p-2 font-bold text-right border-r border-slate-100">{formatCurrency(m.amount)}</td>
                  <td className="p-2 text-center text-slate-500 border-r border-slate-100 max-w-[80px]">{m.method || 'Cash'}</td>
                  <td className="p-2 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <button 
                        onClick={() => handleEditReceived(m)}
                        className="text-blue-600 hover:text-blue-800"
                        title="Edit"
                      >
                        <Pencil className="w-3 h-3" />
                      </button>
                      <button 
                        onClick={() => onDeletePersonalReceivedMoney(m.id)}
                        className="text-red-500 hover:text-red-700"
                        title="Delete"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {userCollections.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-4 text-center text-gray-500">No received money records</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {(profile?.role === "admin" || profile?.role === "super_admin" || user?.email === "bijoymahmudmunna@gmail.com") && (
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-red-800 underline">Given Money History</h3>
          <div className="overflow-hidden rounded-lg border border-[#B0BEC5] bg-white">
            <table className="w-full text-[10px] text-left">
              <thead className="bg-[#D32F2F] text-white">
                <tr>
                  <th className="p-2">Date</th>
                  <th className="p-2">Name</th>
                  <th className="p-2">Project</th>
                  <th className="p-2 text-right">Amount</th>
                  <th className="p-2 text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {userGiven.map((m, i) => (
                  <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-red-50/30"}>
                    <td className="p-2 border-r border-slate-100">{m.date}</td>
                    <td className="p-2 border-r border-slate-100 truncate max-w-[100px]">{m.name || '-'}</td>
                    <td className="p-2 border-r border-slate-100 truncate max-w-[100px]">{m.projectName || '-'}</td>
                    <td className="p-2 font-bold text-right border-r border-slate-100">{formatCurrency(m.amount)}</td>
                    <td className="p-2 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button 
                          onClick={() => handleEditGiven(m)}
                          className="text-blue-600 hover:text-blue-800"
                          title="Edit"
                        >
                          <Pencil className="w-3 h-3" />
                        </button>
                        <button 
                          onClick={() => onDeletePersonalGivenMoney(m.id)}
                          className="text-red-500 hover:text-red-700"
                          title="Delete"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {userGiven.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-4 text-center text-gray-500">No given money records</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="space-y-4">
        <h3 className="text-sm font-bold text-[#0D47A1] underline">My Recent Entries</h3>
        <div className="overflow-hidden rounded-lg border border-[#B0BEC5] bg-white">
          <table className="w-full text-[10px] text-left">
            <thead className="bg-[#0D47A1] text-white">
              <tr>
                <th className="p-2">Date</th>
                <th className="p-2">Name</th>
                <th className="p-2">Project</th>
                <th className="p-2 text-right w-[20%]">Amount</th>
              </tr>
            </thead>
            <tbody>
              {recentEntries.map((e, i) => (
                <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-blue-50/30"}>
                  <td className="p-2 border-r border-slate-100">{e.timestamp.split(',')[0]}</td>
                  <td className="p-2 border-r border-slate-100 truncate max-w-[100px]">{e.name}</td>
                  <td className="p-2 border-r border-slate-100 truncate max-w-[100px]">{e.projectName}</td>
                  <td className="p-2 font-bold text-right pr-4">{formatCurrency(e.amount)}</td>
                </tr>
              ))}
              {recentEntries.length === 0 && (
                <tr>
                  <td colSpan={4} className="p-4 text-center text-gray-500">No recent entries</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function AddDataView({
  onAddPayment,
  onAddProject,
  onBack,
  payments,
  projectExpenses,
  projectList,
}: {
  onAddPayment: (p: Omit<EmployeePayment, "id">) => void;
  onAddProject: (p: Omit<ProjectExpense, "id">) => void;
  onBack: () => void;
  payments: EmployeePayment[];
  projectExpenses: ProjectExpense[];
  projectList: ProjectListEntry[];
}) {
  const [entryDate, setEntryDate] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  });

  const [empForm, setEmpForm] = useState({
    uniqueId:
      "ATE-" +
      Math.floor(Math.random() * 1000000)
        .toString()
        .padStart(6, "0"),
    employeeName: "",
    projectName: "",
    payment: "",
    transport: "",
  });

  const [projForm, setProjForm] = useState({
    uniqueId:
      "ATP-" +
      Math.floor(Math.random() * 1000000)
        .toString()
        .padStart(6, "0"),
    projectName: "",
    materialsCost: "",
    materialsName: "",
    transportCost: "",
    othersCost: "",
  });

  // Extract unique names for suggestions, ignoring case sensitivity
  const employeeNames = Array.from(
    new Map(
      payments
        .map((p) => p.employeeName)
        .filter(Boolean)
        .map((name) => [name.trim().toLowerCase(), name.trim()]),
    ).values(),
  );

  const projectNames = Array.from(
    new Map(
      [
        ...payments.map((p) => p.projectName),
        ...projectExpenses.map((p) => p.projectName),
        ...projectList.map((p) => p.projectName),
      ]
        .filter(Boolean)
        .map((name) => [name.trim().toLowerCase(), name.trim()]),
    ).values(),
  );

  const handleSave = async () => {
    let saved = false;

    const pad = (n: number) => String(n).padStart(2, "0");
    let customTimestamp = new Date().toLocaleString("en-GB");
    if (entryDate) {
      const d = new Date(entryDate);
      const now = new Date();
      customTimestamp = `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}, ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
    }

    try {
      if (
        empForm.employeeName &&
        empForm.projectName &&
        (empForm.payment || empForm.transport)
      ) {
        await onAddPayment({
          ...empForm,
          timestamp: customTimestamp,
          payment: parseFloat(empForm.payment || "0"),
          transport: parseFloat(empForm.transport || "0"),
        });
        saved = true;
      }

      if (
        projForm.projectName &&
        (projForm.materialsCost ||
          projForm.transportCost ||
          projForm.othersCost)
      ) {
        await onAddProject({
          ...projForm,
          timestamp: customTimestamp,
          materialsCost: parseFloat(projForm.materialsCost || "0"),
          materialsName: projForm.materialsName || "",
          transportCost: parseFloat(projForm.transportCost || "0"),
          othersCost: parseFloat(projForm.othersCost || "0"),
          budget: 0,
        });
        saved = true;
      }

      if (saved) {
        alert("Data saved successfully!");
        onBack();
      } else {
        alert(
          "Please fill in at least one section (Employee or Project) with required fields.",
        );
      }
    } catch (error) {
      // Errors are alerted inside the onAdd... functions, so just do nothing here.
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={onBack}
            className="p-1 hover:bg-[#F5F5F5] rounded-full transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h2 className="text-xl font-bold border-b-2 border-[#0D47A1] inline-block pb-1">
            Add Data
          </h2>
        </div>

        <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-[#B0BEC5] shadow-sm">
          <label className="text-xs font-bold text-[#455A64]">Date:</label>
          <input
            type="date"
            value={entryDate}
            onChange={(e) => setEntryDate(e.target.value)}
            className="text-sm font-bold text-[#0D47A1] bg-transparent outline-none"
          />
        </div>
      </div>

      {/* For Employee Section */}
      <div className="bg-white rounded-xl shadow-md border border-[#B0BEC5] overflow-hidden">
        <div className="bg-[#BBDEFB] p-2 text-center text-[#0D47A1] font-bold text-sm">
          FOR EMPLOYEE
        </div>
        <div className="p-4 space-y-3">
          <InputField label="UNIQUE ID:" value={empForm.uniqueId} readOnly />
          <InputField
            label="EMPLOYEE NAME:"
            value={empForm.employeeName}
            onChange={(v) => setEmpForm({ ...empForm, employeeName: v })}
            suggestions={employeeNames}
          />
          <InputField
            label="PROJECT NAME:"
            value={empForm.projectName}
            onChange={(v) => setEmpForm({ ...empForm, projectName: v })}
            suggestions={projectNames}
          />
          <InputField
            label="PAYMENT:"
            type="number"
            value={empForm.payment}
            onChange={(v) => setEmpForm({ ...empForm, payment: v })}
          />
          <InputField
            label="TRANSPORT:"
            type="number"
            value={empForm.transport}
            onChange={(v) => setEmpForm({ ...empForm, transport: v })}
          />
        </div>
      </div>

      {/* For Project Section */}
      <div className="bg-white rounded-xl shadow-md border border-[#B0BEC5] overflow-hidden">
        <div className="bg-[#BBDEFB] p-2 text-center text-[#0D47A1] font-bold text-sm">
          FOR PROJECT
        </div>
        <div className="p-4 space-y-3">
          <InputField label="UNIQUE ID:" value={projForm.uniqueId} readOnly />
          <InputField
            label="PROJECT NAME:"
            value={projForm.projectName}
            onChange={(v) => setProjForm({ ...projForm, projectName: v })}
            suggestions={projectNames}
          />
          <InputField
            label="MATERIALS COST:"
            type="number"
            value={projForm.materialsCost}
            onChange={(v) => setProjForm({ ...projForm, materialsCost: v })}
          />
          <InputField
            label="MATERIALS NAME:"
            type="text"
            value={projForm.materialsName}
            onChange={(v) => setProjForm({ ...projForm, materialsName: v })}
          />
          <InputField
            label="TRANSPORT:"
            type="number"
            value={projForm.transportCost}
            onChange={(v) => setProjForm({ ...projForm, transportCost: v })}
          />
          <InputField
            label="OTHERS COST:"
            type="number"
            value={projForm.othersCost}
            onChange={(v) => setProjForm({ ...projForm, othersCost: v })}
          />
        </div>
      </div>

      <button
        onClick={handleSave}
        className="w-full bg-[#558B2F] text-white font-bold py-3 rounded-lg shadow-lg hover:bg-[#33691E] hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
      >
        Save Data
      </button>
    </div>
  );
}

function InputField({
  label,
  value,
  onChange,
  readOnly,
  type = "text",
  suggestions = [],
}: {
  label: string;
  value: string;
  onChange?: (v: string) => void;
  readOnly?: boolean;
  type?: string;
  suggestions?: string[];
}) {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const filteredSuggestions = suggestions
    .filter(
      (s) =>
        s.toLowerCase().includes(value.toLowerCase()) &&
        s.toLowerCase() !== value.toLowerCase(),
    )
    .slice(0, 5);

  return (
    <div className="flex flex-col gap-1 relative">
      <div className="flex items-center gap-2">
        <label className="w-1/3 text-[10px] font-bold bg-[#CFD8DC] p-2 rounded">
          {label}
        </label>
        <div className="w-2/3 relative">
          <input
            type={type}
            className={`w-full border-2 border-[#0D47A1] rounded p-1 text-sm font-bold ${readOnly ? "bg-[#F5F5F5] text-[#78909C] border-[#B0BEC5]" : "bg-white"}`}
            value={value}
            onChange={(e) => {
              onChange?.(e.target.value);
              setShowSuggestions(true);
            }}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
            readOnly={readOnly}
            disabled={readOnly}
          />
          {showSuggestions && filteredSuggestions.length > 0 && (
            <div className="absolute z-10 w-full bg-white border border-[#B0BEC5] rounded-md shadow-lg mt-1 max-h-40 overflow-y-auto">
              {filteredSuggestions.map((s, i) => (
                <button
                  key={i}
                  className="w-full text-left p-2 text-xs hover:bg-[#E3F2FD] transition-colors font-bold text-[#1A237E]"
                  onClick={() => {
                    onChange?.(s);
                    setShowSuggestions(false);
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function PaymentHistoryView({
  payments,
  projectExpenses,
  filter,
  setFilter,
  onDeletePayment,
  onDeletePayments,
  onUpdatePayment,
  onDeleteProject,
  onDeleteProjects,
  onUpdateProject,
  isAdmin,
  isSuperAdmin,
}: {
  payments: EmployeePayment[];
  projectExpenses: ProjectExpense[];
  filter: string;
  setFilter: (f: any) => void;
  onDeletePayment: (id: string) => void;
  onDeletePayments: (ids: string[]) => void;
  onUpdatePayment: (id: string, updated: Partial<EmployeePayment>) => void;
  onDeleteProject: (id: string) => void;
  onDeleteProjects: (ids: string[]) => void;
  onUpdateProject: (id: string, updated: Partial<ProjectExpense>) => void;
  isAdmin: boolean;
  isSuperAdmin?: boolean;
}) {
  const [activeTab, setActiveTab] = useState<"EMPLOYEE" | "PROJECT">(
    "EMPLOYEE",
  );
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<any>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showConfirm, setShowConfirm] = useState<{
    id?: string;
    ids?: string[];
  } | null>(null);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
    );
  };

  const toggleSelectAll = (ids: string[]) => {
    if (selectedIds.length === ids.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(ids);
    }
  };

  const confirmDelete = () => {
    if (!showConfirm) return;

    if (showConfirm.id) {
      if (activeTab === "EMPLOYEE") onDeletePayment(showConfirm.id);
      else onDeleteProject(showConfirm.id);
    } else if (showConfirm.ids) {
      if (activeTab === "EMPLOYEE") onDeletePayments(showConfirm.ids);
      else onDeleteProjects(showConfirm.ids);
      setSelectedIds([]);
    }

    setShowConfirm(null);
  };

  const startEdit = (item: any) => {
    setEditingId(item.id);
    setEditForm({ ...item });
  };

  const saveEdit = () => {
    if (activeTab === "EMPLOYEE") {
      onUpdatePayment(editingId!, {
        ...editForm,
        payment: parseFloat(editForm.payment || "0"),
        transport: parseFloat(editForm.transport || "0"),
      });
    } else {
      onUpdateProject(editingId!, {
        ...editForm,
        materialsCost: parseFloat(editForm.materialsCost),
        materialsName: editForm.materialsName || "",
        transportCost: parseFloat(editForm.transportCost),
        othersCost: parseFloat(editForm.othersCost),
      });
    }
    setEditingId(null);
    setEditForm(null);
  };

  const parseDate = (dateStr: string) => {
    try {
      const [datePart] = dateStr.split(",");
      const [day, month, year] = datePart.trim().split("/");
      return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    } catch (e) {
      return new Date(0);
    }
  };

  const years = Array.from({ length: 26 }, (_, i) => 2025 + i);
  const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  const filteredData = useMemo(() => {
    const now = new Date();
    const data = activeTab === "EMPLOYEE" ? payments : projectExpenses;

    return data
      .filter((item) => {
        const itemDate = parseDate(item.timestamp);

        switch (filter) {
          case "Daily":
            // "daily tab a sob tarikher data dekhabe" - Show all data
            return true;
          case "Monthly":
            return (
              itemDate.getMonth() === selectedMonth &&
              itemDate.getFullYear() === selectedYear
            );
          case "Annual":
            return itemDate.getFullYear() === selectedYear;
          case "Custom":
            if (!startDate || !endDate) return true;
            const s = new Date(startDate);
            const e = new Date(endDate);
            s.setHours(0, 0, 0, 0);
            e.setHours(23, 59, 59, 999);
            return itemDate >= s && itemDate <= e;
          default:
            return true;
        }
      })
      .sort((a, b) => {
        const dateA = parseDate(a.timestamp).getTime();
        const dateB = parseDate(b.timestamp).getTime();
        return dateB - dateA;
      });
  }, [
    payments,
    projectExpenses,
    activeTab,
    filter,
    startDate,
    endDate,
    selectedYear,
    selectedMonth,
  ]);

  return (
    <div className="space-y-4 md:space-y-6">
      <h2 className="text-lg md:text-xl font-bold border-b-2 border-[#0D47A1] inline-block pb-1 text-[#FF9900]">
        Payment History
      </h2>

      {/* Tabs */}
      <div className="flex border-b border-[#B0BEC5] overflow-x-auto no-scrollbar">
        <button
          onClick={() => setActiveTab("EMPLOYEE")}
          className={`flex-1 py-2 px-4 text-xs md:text-sm font-bold whitespace-nowrap transition-all cursor-pointer ${
            activeTab === "EMPLOYEE"
              ? "border-b-2 border-[#0D47A1] text-[#0D47A1] bg-[#E3F2FD]/30"
              : "text-[#78909C] hover:text-[#0D47A1] hover:bg-[#F5F5F5]"
          }`}
        >
          EMPLOYEE PAYMENTS
        </button>
        <button
          onClick={() => setActiveTab("PROJECT")}
          className={`flex-1 py-2 px-4 text-xs md:text-sm font-bold whitespace-nowrap transition-all cursor-pointer ${
            activeTab === "PROJECT"
              ? "border-b-2 border-[#0D47A1] text-[#0D47A1] bg-[#E3F2FD]/30"
              : "text-[#78909C] hover:text-[#0D47A1] hover:bg-[#F5F5F5]"
          }`}
        >
          PROJECT EXPENSES
        </button>
      </div>

      {/* Main Filters */}
      <div className="flex gap-1 md:gap-2 justify-between overflow-x-auto no-scrollbar pb-1">
        {["Daily", "Monthly", "Annual", "Custom"].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 md:px-4 py-1 rounded text-[10px] md:text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
              filter === f
                ? "bg-[#8BC34A] text-white shadow-md scale-105"
                : "bg-[#B0BEC5] text-white hover:bg-[#90A4AE]"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Sub-tabs for Monthly */}
      {filter === "Monthly" && (
        <div className="flex flex-wrap gap-2 py-3 border-y border-[#B0BEC5]/20 bg-white p-3 rounded-lg shadow-sm">
          <div className="flex-1 min-w-[120px]">
            <label className="text-[10px] font-bold text-[#78909C] block mb-1">
              SELECT MONTH:
            </label>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
              className="w-full border border-[#B0BEC5] rounded p-1.5 text-xs bg-white"
            >
              {months.map((m, idx) => (
                <option key={m} value={idx}>
                  {m}
                </option>
              ))}
            </select>
          </div>
          <div className="flex-1 min-w-[100px]">
            <label className="text-[10px] font-bold text-[#78909C] block mb-1">
              SELECT YEAR:
            </label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              className="w-full border border-[#B0BEC5] rounded p-1.5 text-xs bg-white"
            >
              {years.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Sub-tabs for Annual */}
      {filter === "Annual" && (
        <div className="flex gap-2 overflow-x-auto no-scrollbar py-2 border-y border-[#B0BEC5]/20">
          {years.map((y) => (
            <button
              key={y}
              onClick={() => setSelectedYear(y)}
              className={`px-3 py-1 rounded-full text-[10px] font-bold whitespace-nowrap transition-all ${selectedYear === y ? "bg-[#0D47A1] text-white scale-105" : "bg-white text-[#0D47A1] border border-[#0D47A1]"}`}
            >
              {y}
            </button>
          ))}
        </div>
      )}

      {/* Bulk Actions */}
      {selectedIds.length > 0 && (
        <div className="flex items-center justify-between bg-[#FFEBEE] p-2 rounded-lg border border-[#EF9A9A] animate-in fade-in slide-in-from-top-2">
          <span className="text-xs font-bold text-[#C62828]">
            {selectedIds.length} items selected
          </span>
          <button
            onClick={() => setShowConfirm({ ids: selectedIds })}
            className="bg-[#C62828] text-white px-3 py-1 rounded text-[10px] font-bold flex items-center gap-1 hover:bg-[#B71C1C] hover:scale-105 active:scale-95 transition-all cursor-pointer shadow-sm"
          >
            <Trash2 className="w-3 h-3" /> DELETE SELECTED
          </button>
        </div>
      )}

      {filter === "Custom" && (
        <div className="flex flex-wrap items-center gap-2 p-3 bg-[#F5F5F5] rounded-lg animate-in fade-in slide-in-from-top-1">
          <span className="bg-[#455A64] text-white text-[10px] px-2 py-1 rounded">
            Date:
          </span>
          <input
            type="date"
            className="border border-[#B0BEC5] rounded p-1 w-full md:w-32 text-xs"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
          <span className="text-xs font-bold mx-auto md:mx-0">to</span>
          <input
            type="date"
            className="border border-[#B0BEC5] rounded p-1 w-full md:w-32 text-xs"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>
      )}

      {/* Confirmation Modal */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[110] p-4">
          <div className="bg-white rounded-xl w-full max-w-xs p-6 space-y-4 shadow-2xl text-center">
            <div className="w-12 h-12 bg-[#FFEBEE] text-[#C62828] rounded-full flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-[#37474F]">Confirm Delete</h3>
            <p className="text-sm text-[#78909C]">
              Are you sure you want to delete{" "}
              {showConfirm.ids
                ? `${showConfirm.ids.length} items`
                : "this item"}
              ? This action cannot be undone.
            </p>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setShowConfirm(null)}
                className="flex-1 py-2 bg-[#ECEFF1] text-[#455A64] rounded font-bold text-sm"
              >
                CANCEL
              </button>
              <button
                onClick={confirmDelete}
                className="flex-1 py-2 bg-[#C62828] text-white rounded font-bold text-sm"
              >
                DELETE
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <h3 className="text-lg font-bold text-[#0D47A1] border-b pb-2">
              Edit Entry
            </h3>
            <div className="space-y-3">
              {activeTab === "EMPLOYEE" ? (
                <>
                  <InputField
                    label="NAME:"
                    value={editForm.employeeName}
                    onChange={(v) =>
                      setEditForm({ ...editForm, employeeName: v })
                    }
                  />
                  <InputField
                    label="PROJECT:"
                    value={editForm.projectName}
                    onChange={(v) =>
                      setEditForm({ ...editForm, projectName: v })
                    }
                  />
                  <InputField
                    label="PAYMENT:"
                    type="number"
                    value={editForm.payment}
                    onChange={(v) => setEditForm({ ...editForm, payment: v })}
                  />
                  <InputField
                    label="TRANSPORT:"
                    type="number"
                    value={editForm.transport}
                    onChange={(v) => setEditForm({ ...editForm, transport: v })}
                  />
                </>
              ) : (
                <>
                  <InputField
                    label="PROJECT NAME:"
                    value={editForm.projectName}
                    onChange={(v) =>
                      setEditForm({ ...editForm, projectName: v })
                    }
                  />
                  <InputField
                    label="MATERIALS COST:"
                    type="number"
                    value={editForm.materialsCost || ""}
                    onChange={(v) =>
                      setEditForm({ ...editForm, materialsCost: v })
                    }
                  />
                  <InputField
                    label="MATERIALS NAME:"
                    type="text"
                    value={editForm.materialsName || ""}
                    onChange={(v) =>
                      setEditForm({ ...editForm, materialsName: v })
                    }
                  />
                  <InputField
                    label="TRANSPORT:"
                    type="number"
                    value={editForm.transportCost || ""}
                    onChange={(v) =>
                      setEditForm({ ...editForm, transportCost: v })
                    }
                  />
                  <InputField
                    label="OTHERS:"
                    type="number"
                    value={editForm.othersCost || ""}
                    onChange={(v) =>
                      setEditForm({ ...editForm, othersCost: v })
                    }
                  />
                </>
              )}
            </div>
            <div className="flex gap-3 pt-4">
              <button
                onClick={() => {
                  setEditingId(null);
                  setEditForm(null);
                }}
                className="flex-1 py-2 bg-[#78909C] text-white rounded font-bold text-sm hover:bg-[#546E7A] transition-colors cursor-pointer"
              >
                CANCEL
              </button>
              <button
                onClick={saveEdit}
                className="flex-1 py-2 bg-[#2E7D32] text-white rounded font-bold text-sm hover:bg-[#1B5E20] transition-colors cursor-pointer"
              >
                SAVE CHANGES
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Table Container */}
      <div className="overflow-x-auto rounded-lg border border-[#B0BEC5] bg-white no-scrollbar">
        <div className="w-full">
          {activeTab === "EMPLOYEE" ? (
            <table className="w-full text-[8px] sm:text-[10px] md:text-xs text-left table-fixed">
              <thead className="bg-[#5D9CEC] text-white">
                <tr>
                  {isAdmin && (
                    <th className="p-1 sm:p-2 border-r border-white/20 w-[8%] text-center">
                      <input
                        type="checkbox"
                        checked={
                          selectedIds.length > 0 &&
                          selectedIds.length === filteredData.length
                        }
                        onChange={() =>
                          toggleSelectAll(filteredData.map((d) => d.id))
                        }
                        className="w-3 h-3"
                      />
                    </th>
                  )}
                  <th className="p-1 sm:p-2 border-r border-white/20 w-[20%]">
                    Date
                  </th>
                  <th className="p-1 sm:p-2 border-r border-white/20 w-[20%]">
                    Name
                  </th>
                  <th className="p-1 sm:p-2 border-r border-white/20 w-[20%]">
                    Project
                  </th>
                  {isSuperAdmin && (
                    <th className="p-1 sm:p-2 border-r border-white/20 w-[15%]">
                      By
                    </th>
                  )}
                  <th className="p-1 sm:p-2 border-r border-white/20 w-[11%]">
                    Pay
                  </th>
                  <th className="p-1 sm:p-2 border-r border-white/20 w-[11%]">
                    Trn
                  </th>
                  {isAdmin && (
                    <th className="p-1 sm:p-2 text-center w-[10%]">Act</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {(filteredData as EmployeePayment[]).map((p, i) => (
                  <tr
                    key={p.id}
                    className={i % 2 === 0 ? "bg-white" : "bg-[#F5F9FD]"}
                  >
                    {isAdmin && (
                      <td className="p-1 sm:p-2 border-r border-[#B0BEC5]/30 text-center">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(p.id)}
                          onChange={() => toggleSelect(p.id)}
                          className="w-3 h-3"
                        />
                      </td>
                    )}
                    <td className="p-1 sm:p-2 border-r border-[#B0BEC5]/30 truncate">
                      {p.timestamp.split(",")[0]}
                    </td>
                    <td className="p-1 sm:p-2 border-r border-[#B0BEC5]/30 truncate">
                      {p.employeeName}
                    </td>
                    <td className="p-1 sm:p-2 border-r border-[#B0BEC5]/30 truncate">
                      {p.projectName}
                    </td>
                    {isSuperAdmin && (
                      <td className="p-1 sm:p-2 border-r border-[#B0BEC5]/30 truncate text-[8px] text-[#78909C]">
                        {p.createdByEmail || "-"}
                      </td>
                    )}
                    <td className="p-1 sm:p-2 border-r border-[#B0BEC5]/30 font-bold truncate">
                      {p.payment.toLocaleString()}
                    </td>
                    <td className="p-1 sm:p-2 border-r border-[#B0BEC5]/30 font-bold truncate">
                      {(p.transport || 0).toLocaleString()}
                    </td>
                    {isAdmin && (
                      <td className="p-1 sm:p-2">
                        <div className="flex justify-center gap-1">
                          <button
                            onClick={() => startEdit(p)}
                            className="p-0.5 text-[#0D47A1] hover:scale-125 transition-transform cursor-pointer"
                          >
                            <Edit2 className="w-3 h-3 sm:w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setShowConfirm({ id: p.id })}
                            className="p-0.5 text-[#D32F2F] hover:scale-125 transition-transform cursor-pointer"
                          >
                            <Trash2 className="w-3 h-3 sm:w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
                {filteredData.length === 0 && (
                  <tr>
                    <td
                      colSpan={isAdmin ? (isSuperAdmin ? 8 : 7) : 5}
                      className="p-8 text-center text-[#78909C]"
                    >
                      No data found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          ) : (
            <table className="w-full text-[8px] sm:text-[10px] md:text-xs text-left table-fixed">
              <thead className="bg-[#4FC3F7] text-white">
                <tr>
                  {isAdmin && (
                    <th className="p-1 sm:p-2 border-r border-white/20 w-[8%] text-center">
                      <input
                        type="checkbox"
                        checked={
                          selectedIds.length > 0 &&
                          selectedIds.length === filteredData.length
                        }
                        onChange={() =>
                          toggleSelectAll(filteredData.map((d) => d.id))
                        }
                        className="w-3 h-3"
                      />
                    </th>
                  )}
                  <th className="p-1 sm:p-2 border-r border-white/20 w-[15%]">
                    Date
                  </th>
                  <th className="p-1 sm:p-2 border-r border-white/20 w-[16%]">
                    Project
                  </th>
                  {isSuperAdmin && (
                    <th className="p-1 sm:p-2 border-r border-white/20 w-[15%]">
                      By
                    </th>
                  )}
                  <th className="p-1 sm:p-2 border-r border-white/20 w-[15%]">
                    Mat. Name
                  </th>
                  <th className="p-1 sm:p-2 border-r border-white/20 w-[12%]">
                    Mat.
                  </th>
                  <th className="p-1 sm:p-2 border-r border-white/20 w-[12%]">
                    Trn.
                  </th>
                  <th className="p-1 sm:p-2 border-r border-white/20 w-[12%]">
                    Oth.
                  </th>
                  {isAdmin && (
                    <th className="p-1 sm:p-2 text-center w-[10%]">Act</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {(filteredData as ProjectExpense[]).map((pe, i) => (
                  <tr
                    key={pe.id}
                    className={i % 2 === 0 ? "bg-white" : "bg-[#F5F9FD]"}
                  >
                    {isAdmin && (
                      <td className="p-1 sm:p-2 border-r border-[#B0BEC5]/30 text-center">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(pe.id)}
                          onChange={() => toggleSelect(pe.id)}
                          className="w-3 h-3"
                        />
                      </td>
                    )}
                    <td className="p-1 sm:p-2 border-r border-[#B0BEC5]/30 truncate">
                      {pe.timestamp.split(",")[0]}
                    </td>
                    <td className="p-1 sm:p-2 border-r border-[#B0BEC5]/30 truncate">
                      {pe.projectName}
                    </td>
                    {isSuperAdmin && (
                      <td className="p-1 sm:p-2 border-r border-[#B0BEC5]/30 truncate text-[8px] text-[#78909C]">
                        {pe.createdByEmail || "-"}
                      </td>
                    )}
                    <td
                      className="p-1 sm:p-2 border-r border-[#B0BEC5]/30 truncate"
                      title={pe.materialsName}
                    >
                      {pe.materialsName || "-"}
                    </td>
                    <td className="p-1 sm:p-2 border-r border-[#B0BEC5]/30 truncate">
                      {pe.materialsCost.toLocaleString()}
                    </td>
                    <td className="p-1 sm:p-2 border-r border-[#B0BEC5]/30 truncate">
                      {pe.transportCost.toLocaleString()}
                    </td>
                    <td className="p-1 sm:p-2 border-r border-[#B0BEC5]/30 font-bold truncate">
                      {pe.othersCost.toLocaleString()}
                    </td>
                    {isAdmin && (
                      <td className="p-1 sm:p-2">
                        <div className="flex justify-center gap-1">
                          <button
                            onClick={() => startEdit(pe)}
                            className="p-0.5 text-[#0D47A1] hover:scale-125 transition-transform cursor-pointer"
                          >
                            <Edit2 className="w-3 h-3 sm:w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setShowConfirm({ id: pe.id })}
                            className="p-0.5 text-[#D32F2F] hover:scale-125 transition-transform cursor-pointer"
                          >
                            <Trash2 className="w-3 h-3 sm:w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
                {filteredData.length === 0 && (
                  <tr>
                    <td
                      colSpan={isAdmin ? 6 : 4}
                      className="p-8 text-center text-[#78909C]"
                    >
                      No data found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

function ProjectListView({
  projects,
  isAdmin,
  isSuperAdmin,
  onBack,
}: {
  projects: ProjectListEntry[];
  isAdmin: boolean;
  isSuperAdmin: boolean;
  onBack: () => void;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [form, setForm] = useState<Partial<ProjectListEntry>>({});
  const [viewingPhoto, setViewingPhoto] = useState<{
    url: string;
    title: string;
  } | null>(null);
  const [viewingGallery, setViewingGallery] = useState<{
    type: string;
    photos: ProjectListEntry["photos"];
    projectId: string;
  } | null>(null);

  const handleEdit = (project: ProjectListEntry) => {
    setEditingId(project.id);
    setForm(project);
    setShowAddForm(true);
  };

  const handleSave = async () => {
    try {
      if (editingId) {
        await updateDoc(doc(db, "project_list", editingId), form);
        setEditingId(null);
      } else {
        const newId = generateId();
        const newProject = { ...form, id: newId } as ProjectListEntry;
        await setDoc(doc(db, "project_list", newId), newProject);
      }
      setForm({});
      setShowAddForm(false);
    } catch (error) {
      console.error("Failed to save project:", error);
      alert("Failed to save project.");
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this project?")) {
      try {
        await deleteDoc(doc(db, "project_list", id));
      } catch (error: any) {
        console.error("Failed to delete project:", error);
        handleFirestoreError(error, OperationType.DELETE, `project_list/${id}`);
      }
    }
  };

  const handleFileChange = async (
    e: React.ChangeEvent<HTMLInputElement>,
    type: ProjectListEntry["photos"][number]["type"],
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Use a higher limit but compress it
    if (file.size > 5000000) {
      alert("File is too large! Please upload a photo smaller than 5MB.");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64 = reader.result as string;
      const compressed = await compressImage(base64);
      
      const newPhoto = {
        id: generateId(),
        url: compressed,
        title: type,
        type,
        timestamp: Date.now(),
      };

      setForm((prev) => ({
        ...prev,
        photos: [...(prev.photos || []), newPhoto],
      }));
    };
    reader.readAsDataURL(file);
  };

  const removePhoto = (id: string) => {
    setForm((prev) => ({
      ...prev,
      photos: (prev.photos || []).filter((p) => p.id !== id),
    }));
  };

  const handleDeletePhotoFromGallery = async (projectId: string, photoId: string, photoUrl?: string) => {
    if (!window.confirm("Are you sure you want to delete this photo?")) return;
    
    try {
      const project = projects.find(p => p.id === projectId);
      if (!project) {
        alert("Project not found.");
        return;
      }
      
      // Filter out by ID, but fallback to URL if ID doesn't match/exist for older data
      const updatedPhotos = (project.photos || []).filter(p => {
        if (p.id && p.id === photoId) return false;
        if (photoUrl && p.url === photoUrl) return false;
        return true;
      });
      
      const docRef = doc(db, "project_list", projectId);
      await updateDoc(docRef, {
        photos: updatedPhotos
      });
      
      // Update local viewing gallery state to reflect changes instantly
      if (viewingGallery) {
        const remainingTypePhotos = updatedPhotos.filter(p => p.type === viewingGallery.type);
        if (remainingTypePhotos.length === 0) {
          setViewingGallery(null);
        } else {
          setViewingGallery({
            ...viewingGallery,
            photos: remainingTypePhotos
          });
        }
      }

      if (viewingPhoto) {
        setViewingPhoto(null);
      }
      
    } catch (error: any) {
      console.error("Failed to delete photo:", error);
      handleFirestoreError(error, OperationType.UPDATE, `project_list/${projectId}`);
    }
  };

  return (
    <div className="space-y-6 pb-40 relative min-h-[600px]">
      <div className="flex items-center gap-2">
        <button
          onClick={onBack}
          className="p-1 hover:bg-[#F5F5F5] rounded-full transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h2 className="text-xl font-bold border-b-2 border-[#0D47A1] inline-block pb-1 text-[#FF8F00]">
          Project List
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {projects.length === 0 ? (
          <div className="col-span-full py-20 text-center bg-white rounded-2xl border-2 border-dashed border-slate-200">
            <Briefcase className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 font-medium">No projects saved yet.</p>
          </div>
        ) : (
          projects.map((project) => (
            <div
              key={project.id}
              className="bg-white p-4 rounded-xl shadow-md border border-[#B0BEC5]/50 flex flex-col relative overflow-hidden group"
            >
              <div
                className={`absolute top-0 left-0 w-1 h-full ${
                  project.status === "Ongoing"
                    ? "bg-blue-500"
                    : project.status === "Struk"
                      ? "bg-red-500"
                      : project.status === "Upcoming"
                        ? "bg-amber-500"
                        : project.status === "Finished"
                          ? "bg-green-500"
                          : "bg-purple-500"
                }`}
              />

              <div className="flex justify-between items-start mb-3 pl-2">
                <h3 className="font-bold text-[#1A237E]">
                  {project.projectName}
                </h3>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    project.status === "Ongoing"
                      ? "bg-blue-50 text-blue-700 border border-blue-200"
                      : project.status === "Struk"
                        ? "bg-red-50 text-red-700 border border-red-200"
                        : project.status === "Upcoming"
                          ? "bg-amber-50 text-amber-700 border border-amber-200"
                          : project.status === "Finished"
                            ? "bg-green-50 text-green-700 border border-green-200"
                            : "bg-purple-50 text-purple-700 border border-purple-200"
                  }`}
                >
                  {project.status}
                </span>
              </div>

              <div className="space-y-2 text-sm pl-2 mb-4">
                <div className="flex justify-between text-[#455A64]">
                  <span className="font-semibold text-xs text-slate-500">
                    Started:
                  </span>
                  <span className="font-mono text-xs">
                    {project.startDate || "N/A"}
                  </span>
                </div>
                <div className="flex justify-between text-[#455A64]">
                  <span className="font-semibold text-xs text-slate-500">
                    Completion:
                  </span>
                  <span className="font-mono text-xs">
                    {project.completeDate || "N/A"}
                  </span>
                </div>
              </div>

              {/* Photo Display Section */}
              {(isAdmin || isSuperAdmin) && (
                <div className="mt-auto pt-4 border-t border-slate-100 grid grid-cols-3 gap-2">
                  {[
                    { type: "Work Order", label: "Work Order", color: "blue" },
                    { type: "Money Receipt", label: "Receipt", color: "green" },
                    { type: "Collect Bill", label: "Collect Bill", color: "orange" },
                  ].map((cat) => {
                    const catPhotos = (project.photos || []).filter(
                      (p) => p.type === cat.type
                    );
                    const hasPhotos = catPhotos.length > 0;

                    return (
                      <button
                        key={cat.type}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (hasPhotos) {
                            setViewingGallery({
                              type: cat.type,
                              photos: catPhotos,
                              projectId: project.id,
                            });
                          }
                        }}
                        className={`group relative flex flex-col items-center justify-center p-2 rounded-xl border-2 border-dashed transition-all ${
                          hasPhotos
                            ? `bg-${cat.color}-50 border-${cat.color}-200 text-${cat.color}-600 hover:bg-${cat.color}-100 cursor-pointer`
                            : "bg-slate-50 border-slate-200 text-slate-300 opacity-60 grayscale cursor-not-allowed"
                        }`}
                      >
                        <div className="relative">
                          <ImageIcon className="w-5 h-5 mb-1" />
                          {hasPhotos && (
                            <span className={`absolute -top-3 -right-3 w-5 h-5 flex items-center justify-center bg-${cat.color}-600 text-white text-[10px] font-black rounded-full shadow-sm ring-2 ring-white animate-in zoom-in`}>
                              {catPhotos.length}
                            </span>
                          )}
                        </div>
                        <span className="text-[9px] font-bold uppercase tracking-wider text-center line-clamp-1 w-full">
                          {cat.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}

              {isAdmin && (
                <div className="pt-3 mt-3 border-t border-slate-100 flex justify-end gap-2">
                  <button
                    onClick={() => handleEdit(project)}
                    className="flex items-center gap-1 px-2 py-1 text-[10px] font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded transition-colors cursor-pointer"
                  >
                    <Edit2 className="w-3 h-3" />
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(project.id)}
                    className="flex items-center gap-1 px-2 py-1 text-[10px] font-bold text-red-600 bg-red-50 hover:bg-red-100 rounded cursor-pointer"
                  >
                    <Trash2 className="w-3 h-3" />
                    Delete
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Image Viewer Overlay */}
      <AnimatePresence>
        {viewingPhoto && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/90 flex flex-col items-center justify-center p-4"
          >
            <div className="absolute top-4 right-4">
              <button
                onClick={() => setViewingPhoto(null)}
                className="p-2 bg-white/10 text-white rounded-full hover:bg-white/20 transition-all cursor-pointer"
              >
                <X className="w-8 h-8" />
              </button>
            </div>
            <div className="w-full max-w-4xl h-full flex flex-col items-center justify-center pointer-events-none text-sans">
              <h3 className="text-white font-bold text-lg mb-4 drop-shadow-md">
                {viewingPhoto.title}
              </h3>
              <div className="relative group max-w-full max-h-[80vh] pointer-events-auto">
                <img
                  src={viewingPhoto.url}
                  alt={viewingPhoto.title}
                  className="max-w-full max-h-full object-contain rounded-lg shadow-2xl border border-white/10"
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {isAdmin && (
        <>
          <div className="fixed bottom-32 right-6 z-50">
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="bg-[#0D47A1] text-white p-3 rounded-full shadow-2xl hover:bg-[#1565C0] transition-all active:scale-95 group flex items-center gap-2 px-5 cursor-pointer font-sans"
            >
              <Plus
                className={`w-5 h-5 transition-transform ${showAddForm ? "rotate-45" : ""}`}
              />
              <span className="font-bold text-sm tracking-wide">Add Project</span>
            </button>
          </div>

          <AnimatePresence>
            {showAddForm && (
              <motion.div
                initial={{ opacity: 0, y: 100 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 100 }}
                className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-4 bg-black/20 backdrop-blur-sm"
              >
                <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 overflow-hidden max-h-[90vh] flex flex-col">
                  <div className="p-4 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
                    <h3 className="font-bold text-[#0D47A1] font-sans">
                      {editingId ? "Edit Project" : "Add New Project"}
                    </h3>
                    <button
                      onClick={() => {
                        setShowAddForm(false);
                        setEditingId(null);
                        setForm({});
                      }}
                      className="text-slate-400 hover:text-slate-600 cursor-pointer p-1 rounded-full hover:bg-slate-200 transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  <div className="p-6 space-y-4 overflow-y-auto custom-scrollbar">
                    <div className="grid grid-cols-1 gap-4 text-left">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-[#78909C] uppercase tracking-wider">
                          Project Name
                        </label>
                        <input
                          type="text"
                          value={form.projectName || ""}
                          onChange={(e) =>
                            setForm({ ...form, projectName: e.target.value })
                          }
                          className="w-full p-2.5 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500/20 transition-all outline-none"
                          placeholder="Enter project name"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-[#78909C] uppercase tracking-wider">
                            Starting Date
                          </label>
                          <input
                            type="date"
                            value={form.startDate || ""}
                            onChange={(e) =>
                              setForm({ ...form, startDate: e.target.value })
                            }
                            className="w-full p-2.5 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500/20 transition-all outline-none"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-[#78909C] uppercase tracking-wider">
                            Complete Date
                          </label>
                          <input
                            type="date"
                            value={form.completeDate || ""}
                            onChange={(e) =>
                              setForm({ ...form, completeDate: e.target.value })
                            }
                            className="w-full p-2.5 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500/20 transition-all outline-none"
                          />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-[#78909C] uppercase tracking-wider">
                          Status
                        </label>
                        <select
                          value={form.status || "Ongoing"}
                          onChange={(e) =>
                            setForm({
                              ...form,
                              status: e.target
                                .value as ProjectListEntry["status"],
                            })
                          }
                          className="w-full p-2.5 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500/20 transition-all outline-none font-bold text-blue-600 cursor-pointer appearance-none"
                        >
                          <option value="Ongoing">Ongoing</option>
                          <option value="Struk">Struk</option>
                          <option value="Upcoming">Upcoming</option>
                          <option value="Finished">Finished</option>
                          <option value="Handover">Handover</option>
                        </select>
                      </div>

                      {(isAdmin || isSuperAdmin) && (
                        <div className="space-y-4 pt-2">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-1">
                            Attachments (Max 10 Photos)
                          </p>

                          <div className="grid grid-cols-2 gap-3">
                            <label className="flex flex-col items-center justify-center gap-2 p-4 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50 cursor-pointer hover:bg-slate-100 transition-all group overflow-hidden">
                              <Camera className="w-6 h-6 text-slate-400 group-hover:text-blue-500 transition-colors" />
                              <div className="text-center">
                                <p className="text-[10px] font-bold text-slate-600">Work Order</p>
                                <p className="text-[8px] text-slate-400">Click to upload</p>
                              </div>
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(e) => handleFileChange(e, "Work Order")}
                              />
                            </label>
                            
                            <label className="flex flex-col items-center justify-center gap-2 p-4 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50 cursor-pointer hover:bg-slate-100 transition-all group overflow-hidden">
                              <Camera className="w-6 h-6 text-slate-400 group-hover:text-green-500 transition-colors" />
                              <div className="text-center">
                                <p className="text-[10px] font-bold text-slate-600">Money Receipt</p>
                                <p className="text-[8px] text-slate-400">Click to upload</p>
                              </div>
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(e) => handleFileChange(e, "Money Receipt")}
                              />
                            </label>

                            <label className="flex flex-col items-center justify-center gap-2 p-4 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50 cursor-pointer hover:bg-slate-100 transition-all group overflow-hidden">
                              <Camera className="w-6 h-6 text-slate-400 group-hover:text-orange-500 transition-colors" />
                              <div className="text-center">
                                <p className="text-[10px] font-bold text-slate-600">Collect Bill</p>
                                <p className="text-[8px] text-slate-400">Click to upload</p>
                              </div>
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(e) => handleFileChange(e, "Collect Bill")}
                              />
                            </label>

                            <label className="flex flex-col items-center justify-center gap-2 p-4 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50 cursor-pointer hover:bg-slate-100 transition-all group overflow-hidden">
                              <Camera className="w-6 h-6 text-slate-400 group-hover:text-purple-500 transition-colors" />
                              <div className="text-center">
                                <p className="text-[10px] font-bold text-slate-600">Other Photo</p>
                                <p className="text-[8px] text-slate-400">Click to upload</p>
                              </div>
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(e) => handleFileChange(e, "Other")}
                              />
                            </label>
                          </div>

                          {form.photos && form.photos.length > 0 && (
                            <div className="space-y-2">
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Selected Photos ({form.photos.length})</p>
                              <div className="grid grid-cols-4 gap-2">
                                {form.photos.map((photo) => (
                                  <div key={photo.id} className="relative aspect-square rounded-lg overflow-hidden border border-slate-200 group">
                                    <img src={photo.url} alt={photo.title} className="w-full h-full object-cover" />
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1">
                                      <span className="text-[8px] text-white font-bold truncate w-full text-center px-1">{photo.title}</span>
                                      <button 
                                        onClick={() => removePhoto(photo.id)}
                                        className="p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                                      >
                                        <Trash2 className="w-3 h-3" />
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="flex justify-end gap-3 pt-6 pb-2">
                      <button
                        onClick={() => {
                          setShowAddForm(false);
                          setEditingId(null);
                          setForm({});
                        }}
                        className="px-6 py-2.5 font-bold text-slate-500 hover:bg-slate-100 rounded-xl transition-all cursor-pointer font-sans"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSave}
                        disabled={!form.projectName}
                        className="px-8 py-2.5 bg-[#0D47A1] text-white font-bold rounded-xl shadow-lg border border-blue-700 disabled:opacity-50 hover:bg-[#1565C0] transition-all transform active:scale-95 cursor-pointer disabled:cursor-not-allowed font-sans tracking-wide"
                      >
                        {editingId ? "Update Project" : "Save Project"}
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}

      {/* Modals */}
      {viewingGallery && (
        <div className="fixed inset-0 z-[100] bg-black/90 flex flex-col pt-safe animate-in fade-in">
          <div className="p-4 flex items-center justify-between border-b border-white/10 bg-slate-900/50 backdrop-blur-md">
            <div>
              <h3 className="text-white font-black text-lg">{viewingGallery.type}</h3>
              <p className="text-slate-400 text-xs">{viewingGallery.photos?.length} Photos Found</p>
            </div>
            <button
              onClick={() => setViewingGallery(null)}
              className="p-2 bg-white/10 text-white rounded-full hover:bg-white/20 transition-all active:scale-90"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 content-start">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 pb-20">
              {viewingGallery.photos?.map((photo) => (
                <div 
                  key={photo.id}
                  className="group relative aspect-square bg-slate-800 rounded-2xl overflow-hidden shadow-2xl border border-white/5 cursor-pointer transform transition-all active:scale-95"
                  onClick={() => setViewingPhoto({ url: photo.url, title: photo.title })}
                >
                  <img src={photo.url} alt={photo.title} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3">
                    <p className="text-white text-[10px] font-bold truncate">{photo.title}</p>
                  </div>
                  
                  {/* Action Buttons */}
                  <div className="absolute top-2 right-2 flex gap-2">
                    {isAdmin && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeletePhotoFromGallery(viewingGallery.projectId, photo.id, photo.url);
                        }}
                        className="p-1.5 bg-red-500/80 backdrop-blur-md rounded-lg text-white hover:bg-red-600 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                    <div className="p-1.5 bg-black/40 backdrop-blur-md rounded-lg text-white">
                      <Maximize2 className="w-4 h-4" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {viewingPhoto && (
        <div className="fixed inset-0 z-[110] bg-black flex flex-col animate-in zoom-in duration-200">
           <div className="p-4 flex items-center justify-between bg-black/40 backdrop-blur-md absolute top-0 left-0 right-0 z-10">
            <div>
              <h3 className="text-white font-bold">{viewingPhoto.title}</h3>
              <p className="text-white/50 text-[10px]">Tap background or close to return</p>
            </div>
            <div className="flex gap-2">
               {isAdmin && viewingGallery && (
                <button
                  onClick={async () => {
                    // Find the photo from the viewing gallery
                    const photo = viewingGallery.photos?.find(p => p.url === viewingPhoto.url);
                    if (photo) {
                      await handleDeletePhotoFromGallery(viewingGallery.projectId, photo.id, photo.url);
                    }
                  }}
                  className="p-2 bg-red-500/20 text-red-500 rounded-full hover:bg-red-500 hover:text-white transition-all"
                  title="Delete Photo"
                >
                  <Trash2 className="w-6 h-6" />
                </button>
              )}
              <button
                onClick={() => setViewingPhoto(null)}
                className="p-2 bg-white/10 text-white rounded-full hover:bg-white/20"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>
          <div className="flex-1 flex items-center justify-center p-4" onClick={(e) => {
            if (e.target === e.currentTarget) setViewingPhoto(null);
          }}>
            <img
              src={viewingPhoto.url}
              alt={viewingPhoto.title}
              className="max-w-full max-h-full object-contain rounded-lg shadow-2xl animate-in fade-in slide-in-from-bottom-5 pointer-events-none"
            />
          </div>
          <div className="p-4 bg-black/40 backdrop-blur-md flex justify-center pb-safe gap-4">
            <a
              href={viewingPhoto.url}
              download={`${viewingPhoto.title.replace(/\s+/g, '_')}.jpg`}
              className="flex items-center gap-2 px-6 py-3 bg-white text-black rounded-2xl font-black text-sm shadow-xl active:scale-95 transition-all"
            >
              <Download className="w-5 h-5" />
              Download
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

function ProjectSummaryView({
  payments,
  projectExpenses,
}: {
  payments: EmployeePayment[];
  projectExpenses: ProjectExpense[];
}) {
  const [search, setSearch] = useState("");

  const projectTotals = useMemo(() => {
    const totals: Record<
      string,
      {
        name: string;
        materialsCost: number;
        cost: number;
        manpowerCost: number;
      }
    > = {};

    // Add employee payments per project
    payments.forEach((p) => {
      const key = p.projectName.trim().toLowerCase();
      if (!totals[key])
        totals[key] = {
          name: p.projectName,
          materialsCost: 0,
          cost: 0,
          manpowerCost: 0,
        };
      const manpower = p.payment + (p.transport || 0);
      totals[key].manpowerCost += manpower;
      totals[key].cost += manpower;
    });

    // Add other project expenses
    projectExpenses.forEach((p) => {
      const key = p.projectName.trim().toLowerCase();
      if (!totals[key])
        totals[key] = {
          name: p.projectName,
          materialsCost: 0,
          cost: 0,
          manpowerCost: 0,
        };

      const totalMaterialsAndTransport =
        p.materialsCost + p.transportCost + p.othersCost;

      totals[key].materialsCost += totalMaterialsAndTransport;
      totals[key].cost += totalMaterialsAndTransport;
    });

    return Object.values(totals).filter((p) =>
      p.name.toLowerCase().includes(search.toLowerCase()),
    );
  }, [payments, projectExpenses, search]);

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold border-b-2 border-[#0D47A1] inline-block pb-1 text-[#FF8F00]">
        Project Summary
      </h2>

      <div className="relative">
        <input
          type="text"
          placeholder="Search"
          className="w-full border border-[#B0BEC5] rounded-full py-2 px-4 pr-10 shadow-sm"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Search className="absolute right-3 top-2.5 w-5 h-5 text-[#B0BEC5]" />
      </div>

      {/* Summary Table */}
      <div className="space-y-2">
        <h3 className="text-sm font-bold text-[#0D47A1] flex items-center gap-2">
          <BarChart3 className="w-4 h-4" />
          Cost Summary
        </h3>
        <div className="overflow-hidden rounded-lg border border-[#B0BEC5] bg-white">
          <div className="overflow-x-auto">
            <table className="w-full text-[10px] sm:text-xs text-left">
              <thead className="bg-[#5D9CEC] text-white">
                <tr>
                  <th className="p-2 border-r border-white/20 w-10 text-center">
                    SI
                  </th>
                  <th className="p-2 border-r border-white/20">Project Name</th>
                  <th className="p-2 border-r border-white/20">
                    Manpower Cost
                  </th>
                  <th className="p-2 border-r border-white/20">
                    Total Materials
                  </th>
                  <th className="p-2">Total Cost</th>
                </tr>
              </thead>
              <tbody>
                {projectTotals.map((p, i) => (
                  <tr
                    key={p.name}
                    className={i % 2 === 0 ? "bg-white" : "bg-[#F5F9FD]"}
                  >
                    <td className="p-2 border-r border-[#B0BEC5]/30 text-center">
                      {(i + 1).toString().padStart(2, "0")}
                    </td>
                    <td className="p-2 border-r border-[#B0BEC5]/30">
                      {p.name}
                    </td>
                    <td className="p-2 border-r border-[#B0BEC5]/30 font-medium">
                      {formatCurrency(p.manpowerCost)}
                    </td>
                    <td className="p-2 border-r border-[#B0BEC5]/30 font-medium">
                      {formatCurrency(p.materialsCost)}
                    </td>
                    <td className="p-2 font-bold text-[#2E7D32]">
                      {formatCurrency(p.cost)}
                    </td>
                  </tr>
                ))}
                {projectTotals.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-[#78909C]">
                      No data found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

function RevenueView({
  projectExpenses,
  payments,
  collectedBills,
  onUpdateBudget,
  onAddCollectedBill,
  onDeleteCollectedBill,
  onDeleteProjectData,
  isAdmin,
  isSuperAdmin,
  projectList,
}: {
  projectExpenses: ProjectExpense[];
  payments: EmployeePayment[];
  collectedBills: CollectedBill[];
  onUpdateBudget: (name: string, budget: number) => void;
  onAddCollectedBill: (bill: Omit<CollectedBill, "id">) => void;
  onDeleteCollectedBill: (id: string) => void;
  onDeleteProjectData: (name: string) => void;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  projectList: ProjectListEntry[];
}) {
  const [activeTab, setActiveTab] = useState<"SUMMARY" | "COLLECT_BILL">(
    "SUMMARY",
  );
  const [search, setSearch] = useState("");
  const [editingBudget, setEditingBudget] = useState<{
    name: string;
    value: string;
  } | null>(null);

  // Collect Bill form state
  const [collectDate, setCollectDate] = useState(
    () => new Date().toISOString().split("T")[0],
  );
  const [collectProject, setCollectProject] = useState("");
  const [collectAmount, setCollectAmount] = useState("");

  const projectNames = useMemo(() => {
    const allNames = [
      ...projectExpenses.map((p) => p.projectName),
      ...payments.map((p) => p.projectName),
      ...collectedBills.map((b) => b.projectName),
      ...projectList.map((p) => p.projectName),
    ].filter(Boolean);

    return Array.from(
      new Map(
        allNames.map((name) => [name.trim().toLowerCase(), name.trim()]),
      ).values(),
    );
  }, [projectExpenses, payments, collectedBills, projectList]);

  const handleCollectBill = async () => {
    if (!collectProject || !collectAmount) return;
    try {
      await onAddCollectedBill({
        date: collectDate,
        projectName: collectProject,
        amount: parseFloat(collectAmount),
      });
      setCollectProject("");
      setCollectAmount("");
      alert("Bill collected successfully!");
    } catch (e) {
      // error handled in AddCollectedBill
    }
  };

  const handleBudgetSave = () => {
    if (editingBudget) {
      onUpdateBudget(editingBudget.name, parseFloat(editingBudget.value) || 0);
      setEditingBudget(null);
    }
  };

  const revenueData = useMemo(() => {
    // Group by project name
    const data: Record<
      string,
      { name: string; budget: number; cost: number; collected: number }
    > = {};

    projectExpenses.forEach((pe) => {
      const key = pe.projectName.trim().toLowerCase();
      if (!data[key])
        data[key] = { name: pe.projectName, budget: 0, cost: 0, collected: 0 };
      if (pe.budget > 0) data[key].budget = pe.budget;
      data[key].cost += pe.materialsCost + pe.transportCost + pe.othersCost;
    });

    payments.forEach((p) => {
      const key = p.projectName.trim().toLowerCase();
      if (!data[key])
        data[key] = { name: p.projectName, budget: 0, cost: 0, collected: 0 };
      data[key].cost += p.payment + (p.transport || 0);
    });

    collectedBills.forEach((cb) => {
      const key = cb.projectName.trim().toLowerCase();
      if (!data[key])
        data[key] = { name: cb.projectName, budget: 0, cost: 0, collected: 0 };
      data[key].collected += cb.amount;
    });

    return Object.values(data)
      .map((p) => ({
        ...p,
        totalBudget: p.budget + p.collected,
        revenue: p.budget + p.collected - p.cost,
      }))
      .filter((p) => p.name.toLowerCase().includes(search.toLowerCase()));
  }, [projectExpenses, payments, collectedBills, search]);

  const sortedCollectedBills = useMemo(() => {
    return [...collectedBills].sort((a, b) => {
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    });
  }, [collectedBills]);

  return (
    <div className="space-y-6 pb-12">
      <h2 className="text-xl font-bold border-b-2 border-[#0D47A1] inline-block pb-1 text-[#FF8F00]">
        Total Revenue
      </h2>

      {/* Tabs */}
      <div className="flex border-b border-[#B0BEC5] mb-4">
        <button
          onClick={() => setActiveTab("SUMMARY")}
          className={`px-4 py-2 text-sm font-bold transition-colors ${
            activeTab === "SUMMARY"
              ? "border-b-2 border-[#0D47A1] text-[#0D47A1] bg-[#E3F2FD]/30"
              : "text-[#78909C] hover:text-[#0D47A1] hover:bg-[#F5F5F5]"
          }`}
        >
          Revenue Summary
        </button>
        <button
          onClick={() => setActiveTab("COLLECT_BILL")}
          className={`px-4 py-2 text-sm font-bold transition-colors ${
            activeTab === "COLLECT_BILL"
              ? "border-b-2 border-[#0D47A1] text-[#0D47A1] bg-[#E3F2FD]/30"
              : "text-[#78909C] hover:text-[#0D47A1] hover:bg-[#F5F5F5]"
          }`}
        >
          Collect Bill
        </button>
      </div>

      {activeTab === "SUMMARY" ? (
        <>
          <div className="relative">
            <input
              type="text"
              placeholder="Search"
              className="w-full border border-[#B0BEC5] rounded-full py-2 px-4 pr-10 shadow-sm"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <Search className="absolute right-3 top-2.5 w-5 h-5 text-[#B0BEC5]" />
          </div>

          <div className="overflow-x-auto rounded-lg border border-[#B0BEC5] bg-white">
            <table className="w-full text-[10px] sm:text-xs text-center min-w-[700px] sm:min-w-full">
              <thead className="bg-[#5D9CEC] text-white">
                <tr>
                  <th className="p-2 border-r border-white/20 w-10">SI</th>
                  <th className="p-2 border-r border-white/20">Project Name</th>
                  <th className="p-2 border-r border-white/20">Budget</th>
                  <th className="p-2 border-r border-white/20">Collected</th>
                  <th className="p-2 border-r border-white/20">Total Budget</th>
                  <th className="p-2 border-r border-white/20">Cost</th>
                  <th className="p-2 border-r border-white/20">Revenue</th>
                  {isSuperAdmin && <th className="p-2 w-10">Act</th>}
                </tr>
              </thead>
              <tbody>
                {revenueData.map((p, i) => (
                  <tr
                    key={p.name}
                    className={i % 2 === 0 ? "bg-white" : "bg-[#F5F9FD]"}
                  >
                    <td className="p-2 border-r border-[#B0BEC5]/30 text-center">
                      {(i + 1).toString().padStart(2, "0")}
                    </td>
                    <td className="p-2 border-r border-[#B0BEC5]/30">
                      {p.name}
                    </td>
                    <td className="p-2 border-r border-[#B0BEC5]/30 font-bold text-[#0D47A1]">
                      {editingBudget?.name === p.name ? (
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            autoFocus
                            className="w-20 p-1 border border-blue-400 rounded text-xs no-spinner"
                            value={editingBudget.value}
                            onChange={(e) =>
                              setEditingBudget({
                                ...editingBudget,
                                value: e.target.value,
                              })
                            }
                          />
                          <button
                            onClick={handleBudgetSave}
                            className="p-1 text-green-600 bg-green-50 rounded cursor-pointer"
                          >
                            <Check className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => setEditingBudget(null)}
                            className="p-1 text-red-600 bg-red-50 rounded cursor-pointer"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center gap-1 group">
                          <span>{formatCurrency(p.budget)}</span>
                          {isSuperAdmin && (
                            <button
                              onClick={() =>
                                setEditingBudget({
                                  name: p.name,
                                  value: p.budget.toString(),
                                })
                              }
                              className="opacity-0 group-hover:opacity-100 p-0.5 text-blue-500 hover:bg-blue-50 rounded transition-opacity cursor-pointer"
                            >
                              <Edit2 className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="p-2 border-r border-[#B0BEC5]/30 font-bold text-[#2E7D32]">
                      {formatCurrency(p.collected)}
                    </td>
                    <td className="p-2 border-r border-[#B0BEC5]/30 font-bold text-amber-600">
                      {formatCurrency(p.totalBudget)}
                    </td>
                    <td className="p-2 border-r border-[#B0BEC5]/30">
                      {formatCurrency(p.cost)}
                    </td>
                    <td
                      className={`p-2 font-bold border-r border-[#B0BEC5]/30 ${p.revenue >= 0 ? "text-[#2E7D32]" : "text-[#C62828]"}`}
                    >
                      {formatCurrency(p.revenue)}
                    </td>
                    {isSuperAdmin && (
                      <td className="p-2">
                        <button
                          onClick={() => onDeleteProjectData(p.name)}
                          className="p-1 text-red-500 hover:bg-red-50 rounded cursor-pointer"
                          title="Delete Project Records"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
                {revenueData.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-8 text-[#78909C]">
                      No data found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <div className="space-y-6">
          <div className="bg-white p-4 rounded-xl shadow border border-[#B0BEC5]">
            <h3 className="font-bold text-[#1A237E] mb-4">
              Add Collected Bill
            </h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-[#455A64] mb-1">
                  Date
                </label>
                <input
                  type="date"
                  className="w-full border border-[#B0BEC5] rounded px-3 py-2 text-sm"
                  value={collectDate}
                  onChange={(e) => setCollectDate(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#455A64] mb-1">
                  Project Name
                </label>
                <input
                  type="text"
                  placeholder="Enter Project Name"
                  className="w-full border border-[#B0BEC5] rounded px-3 py-2 text-sm"
                  value={collectProject}
                  onChange={(e) => setCollectProject(e.target.value)}
                  list="collect-project-suggestions"
                />
                <datalist id="collect-project-suggestions">
                  {projectNames.map((name) => (
                    <option key={name} value={name} />
                  ))}
                </datalist>
              </div>
              <div>
                <label className="block text-xs font-bold text-[#455A64] mb-1">
                  Amount (Tk)
                </label>
                <input
                  type="number"
                  placeholder="Enter Amount"
                  className="w-full border border-[#B0BEC5] rounded px-3 py-2 text-sm"
                  value={collectAmount}
                  onChange={(e) => setCollectAmount(e.target.value)}
                />
              </div>
              <button
                onClick={handleCollectBill}
                className="w-full py-2 mt-2 bg-[#0D47A1] text-white font-bold rounded shadow hover:bg-[#1565C0] transition-colors"
              >
                Save Bill
              </button>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow border border-[#B0BEC5] overflow-hidden">
            <h3 className="font-bold text-[#1A237E] p-3 border-b border-[#B0BEC5]/30">
              Collected Bills History
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-[10px] sm:text-xs text-center">
                <thead className="bg-[#4FC3F7] text-white">
                  <tr>
                    <th className="p-2 border-r border-white/20 w-10">SI</th>
                    <th className="p-2 border-r border-white/20">Date</th>
                    <th className="p-2 border-r border-white/20">
                      Project Name
                    </th>
                    {isSuperAdmin && (
                      <th className="p-2 border-r border-white/20">Created By</th>
                    )}
                    <th className="p-2 border-r border-white/20">Amount</th>
                    {isSuperAdmin && <th className="p-2 w-12">Action</th>}
                  </tr>
                </thead>
                <tbody>
                  {sortedCollectedBills.map((bill, i) => (
                    <tr
                      key={bill.id || i}
                      className={i % 2 === 0 ? "bg-white" : "bg-[#F5F9FD]"}
                    >
                      <td className="p-2 border-r border-[#B0BEC5]/30 text-center">
                        {(i + 1).toString().padStart(2, "0")}
                      </td>
                      <td className="p-2 border-r border-[#B0BEC5]/30 whitespace-nowrap">
                        {bill.date}
                      </td>
                      <td className="p-2 border-r border-[#B0BEC5]/30 font-medium">
                        {bill.projectName}
                      </td>
                      {isSuperAdmin && (
                        <td className="p-2 border-r border-[#B0BEC5]/30 text-[8px] text-[#78909C]">
                          {bill.createdByEmail || "-"}
                        </td>
                      )}
                      <td
                        className={`p-2 font-bold text-[#2E7D32] ${isSuperAdmin ? "border-r border-[#B0BEC5]/30" : ""}`}
                      >
                        {formatCurrency(bill.amount)}
                      </td>
                      {isSuperAdmin && (
                        <td className="p-2">
                          <button
                            onClick={async () => {
                              if (
                                window.confirm("Delete this collection record?")
                              ) {
                                try {
                                  await onDeleteCollectedBill(bill.id);
                                  alert("Record deleted successfully!");
                                } catch (err) {
                                  // Error handled in parent
                                }
                              }
                            }}
                            className="p-1 text-red-600 hover:bg-red-50 rounded cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                  {collectedBills.length === 0 && (
                    <tr>
                      <td colSpan={3} className="p-6 text-[#78909C]">
                        No collected bills yet
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function EmployeeTotalsView({
  payments,
  onBack,
}: {
  payments: EmployeePayment[];
  onBack: () => void;
}) {
  const [search, setSearch] = useState("");

  const employeeTotals = useMemo(() => {
    const totals: Record<
      string,
      { name: string; payment: number; transport: number; total: number }
    > = {};

    payments.forEach((p) => {
      const key = p.employeeName.trim().toLowerCase();
      if (!totals[key])
        totals[key] = {
          name: p.employeeName,
          payment: 0,
          transport: 0,
          total: 0,
        };
      totals[key].payment += p.payment;
      totals[key].transport += p.transport || 0;
      totals[key].total += p.payment + (p.transport || 0);
    });

    return Object.values(totals)
      .filter((e) => e.name.toLowerCase().includes(search.toLowerCase()))
      .sort((a, b) => b.total - a.total);
  }, [payments, search]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <button onClick={onBack} className="p-1">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h2 className="text-xl font-bold border-b-2 border-[#0D47A1] inline-block pb-1 text-[#FF8F00]">
          Employee Payment Details
        </h2>
      </div>

      <div className="relative">
        <input
          type="text"
          placeholder="Search Employee"
          className="w-full border border-[#B0BEC5] rounded-full py-2 px-4 pr-10 shadow-sm"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Search className="absolute right-3 top-2.5 w-5 h-5 text-[#B0BEC5]" />
      </div>

      <div className="overflow-x-auto rounded-lg border border-[#B0BEC5] bg-white">
        <table className="w-full text-xs text-left min-w-[500px] sm:min-w-full">
          <thead className="bg-[#5D9CEC] text-white">
            <tr>
              <th className="p-2 border-r border-white/20 w-12 text-center">
                SI
              </th>
              <th className="p-2 border-r border-white/20">Employee Name</th>
              <th className="p-2 border-r border-white/20">Payment</th>
              <th className="p-2 border-r border-white/20">Transport</th>
              <th className="p-2">Total Amount</th>
            </tr>
          </thead>
          <tbody>
            {employeeTotals.map((e, i) => (
              <tr
                key={e.name}
                className={i % 2 === 0 ? "bg-white" : "bg-[#F5F9FD]"}
              >
                <td className="p-2 border-r border-[#B0BEC5]/30 text-center">
                  {(i + 1).toString().padStart(2, "0")}
                </td>
                <td className="p-2 border-r border-[#B0BEC5]/30">{e.name}</td>
                <td className="p-2 border-r border-[#B0BEC5]/30">
                  {formatCurrency(e.payment)}
                </td>
                <td className="p-2 border-r border-[#B0BEC5]/30">
                  {formatCurrency(e.transport)}
                </td>
                <td className="p-2 font-bold">{formatCurrency(e.total)}</td>
              </tr>
            ))}
            {employeeTotals.length === 0 && (
              <tr>
                <td colSpan={5} className="p-8 text-center text-[#78909C]">
                  No employees found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ExportView({
  payments,
  projectExpenses,
  bills,
  tomorrowWorkData,
  nextBillNumber,
  nextQuotationNumber,
  setPayments,
  setProjectExpenses,
  setBills,
  setTomorrowWorkData,
  setNextBillNumber,
  setNextQuotationNumber,
  onBack,
  pdfSettings,
}: {
  payments: EmployeePayment[];
  projectExpenses: ProjectExpense[];
  bills: Bill[];
  tomorrowWorkData: { [date: string]: TomorrowWorkRow[] };
  nextBillNumber: number;
  nextQuotationNumber: number;
  setPayments: React.Dispatch<React.SetStateAction<EmployeePayment[]>>;
  setProjectExpenses: React.Dispatch<React.SetStateAction<ProjectExpense[]>>;
  setBills: React.Dispatch<React.SetStateAction<Bill[]>>;
  setTomorrowWorkData: React.Dispatch<
    React.SetStateAction<{ [date: string]: TomorrowWorkRow[] }>
  >;
  setNextBillNumber: React.Dispatch<React.SetStateAction<number>>;
  setNextQuotationNumber: React.Dispatch<React.SetStateAction<number>>;
  onBack: () => void;
  pdfSettings: PDFSettings;
}) {
  const [includeEmployee, setIncludeEmployee] = useState(true);
  const [includeMaterials, setIncludeMaterials] = useState(true);
  const [includeEmployeeTotals, setIncludeEmployeeTotals] = useState(true);

  const generatePDF = async () => {
    const doc = new jsPDF();
    let currentY = 35;

    const hexToRgb = (hex: string) => {
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      return result
        ? [
            parseInt(result[1], 16),
            parseInt(result[2], 16),
            parseInt(result[3], 16),
          ]
        : [0, 0, 0];
    };

    const headerTextRgb = hexToRgb(pdfSettings.headerTextColor);
    const headerBgRgb = hexToRgb(pdfSettings.headerBgColor);

    // Header Background
    if (pdfSettings.headerBgColor.toUpperCase() !== "#FFFFFF") {
      doc.setFillColor(headerBgRgb[0], headerBgRgb[1], headerBgRgb[2]);
      doc.rect(0, 0, 210, 35, "F");
    }

    doc.setFontSize(28);
    doc.setTextColor(headerTextRgb[0], headerTextRgb[1], headerTextRgb[2]);
    doc.setFont(pdfSettings.fontStyle, "bold");

    if (pdfSettings.logo) {
      const isWideLogo = pdfSettings.hideNameText;
      // Adjusted for 3000x250 (12:1) aspect ratio
      const logoWidth = isWideLogo ? 160 : 40;
      const logoHeight = isWideLogo ? 13.33 : 13.33;
      const logoX = isWideLogo ? (210 - logoWidth) / 2 : 20;
      const logoY = isWideLogo ? 10 : 10;
      doc.addImage(
        pdfSettings.logo,
        "PNG",
        logoX,
        logoY,
        logoWidth,
        logoHeight,
      );
    }

    if (!pdfSettings.hideNameText) {
      const nameX = pdfSettings.logo ? 60 : 105;
      const textAlign = pdfSettings.logo ? "left" : "center";
      doc.text(pdfSettings.companyName, nameX, 22, { align: textAlign });
    }

    currentY = 45; // Adjust start Y after header

    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.setFont(pdfSettings.fontStyle, "normal");
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 105, currentY, {
      align: "center",
    });
    currentY += 15;

    if (includeEmployee) {
      doc.setFontSize(14);
      doc.setTextColor(0);
      doc.text("Employee Payments", 14, currentY);
      currentY += 5;

      const totalPayment = payments.reduce((sum, p) => sum + p.payment, 0);
      const totalTransport = payments.reduce(
        (sum, p) => sum + (p.transport || 0),
        0,
      );
      const grandTotal = totalPayment + totalTransport;

      autoTable(doc, {
        startY: currentY,
        head: [
          ["Date", "ID", "Employee Name", "Project", "Pay", "Trn", "Total"],
        ],
        body: [
          ...payments.map((p) => [
            p.timestamp.split(",")[0],
            p.uniqueId,
            p.employeeName,
            p.projectName,
            p.payment.toLocaleString(),
            (p.transport || 0).toLocaleString(),
            `Tk. ${(p.payment + (p.transport || 0)).toLocaleString()}`,
          ]),
          [
            {
              content: "TOTAL",
              colSpan: 4,
              styles: { halign: "right", fontStyle: "bold" },
            },
            {
              content: totalPayment.toLocaleString(),
              styles: { fontStyle: "bold" },
            },
            {
              content: totalTransport.toLocaleString(),
              styles: { fontStyle: "bold" },
            },
            {
              content: `Tk. ${grandTotal.toLocaleString()}`,
              styles: { fontStyle: "bold", fillColor: [255, 243, 224] },
            },
          ],
        ],
        theme: "striped",
        headStyles: { fillColor: [93, 156, 236] },
        footStyles: {
          fillColor: [240, 240, 240],
          textColor: [0, 0, 0],
          fontStyle: "bold",
        },
        styles: { textColor: [40, 40, 40], fontSize: 8 },
        columnStyles: {
          0: { cellWidth: 20 },
          1: { cellWidth: 25 },
          2: { cellWidth: 35 },
          3: { cellWidth: 35 },
          4: { cellWidth: 15, halign: "right" },
          5: { cellWidth: 15, halign: "right" },
          6: { cellWidth: 25, halign: "right" },
        },
      });
      currentY = (doc as any).lastAutoTable.finalY + 15;
    }

    if (includeEmployeeTotals) {
      if (currentY > 230) {
        doc.addPage();
        currentY = 20;
      }

      doc.setFontSize(14);
      doc.setTextColor(0);
      doc.text("Employee Payment Details (Totals)", 14, currentY);
      currentY += 5;

      const totals: Record<
        string,
        { name: string; payment: number; transport: number; total: number }
      > = {};
      payments.forEach((p) => {
        const key = p.employeeName.trim().toLowerCase();
        if (!totals[key])
          totals[key] = {
            name: p.employeeName,
            payment: 0,
            transport: 0,
            total: 0,
          };
        totals[key].payment += p.payment;
        totals[key].transport += p.transport || 0;
        totals[key].total += p.payment + (p.transport || 0);
      });

      const employeeTotals = Object.values(totals).sort(
        (a, b) => b.total - a.total,
      );

      autoTable(doc, {
        startY: currentY,
        head: [["SI", "Employee Name", "Payment", "Transport", "Total Amount"]],
        body: [
          ...employeeTotals.map((e, i) => [
            (i + 1).toString().padStart(2, "0"),
            e.name,
            `Tk. ${e.payment.toLocaleString()}`,
            `Tk. ${e.transport.toLocaleString()}`,
            `Tk. ${e.total.toLocaleString()}`,
          ]),
        ],
        theme: "striped",
        headStyles: { fillColor: [77, 182, 172] },
        styles: { textColor: [40, 40, 40] },
      });
      currentY = (doc as any).lastAutoTable.finalY + 15;
    }

    if (includeMaterials) {
      if (currentY > 230) {
        doc.addPage();
        currentY = 20;
      }

      doc.setFontSize(14);
      doc.setTextColor(0);
      doc.text("Project Expenses (Materials/Transport)", 14, currentY);
      currentY += 5;

      const totalMaterials = projectExpenses.reduce(
        (sum, p) => sum + p.materialsCost,
        0,
      );
      const totalTransport = projectExpenses.reduce(
        (sum, p) => sum + p.transportCost,
        0,
      );
      const totalOthers = projectExpenses.reduce(
        (sum, p) => sum + p.othersCost,
        0,
      );
      const grandTotal = totalMaterials + totalTransport + totalOthers;

      autoTable(doc, {
        startY: currentY,
        head: [["Date", "ID", "Project", "Materials", "Transport", "Others"]],
        body: [
          ...projectExpenses.map((p) => [
            p.timestamp,
            p.uniqueId,
            p.projectName,
            `Tk. ${p.materialsCost.toLocaleString()}`,
            `Tk. ${p.transportCost.toLocaleString()}`,
            `Tk. ${p.othersCost.toLocaleString()}`,
          ]),
          [
            {
              content: "TOTAL",
              colSpan: 3,
              styles: { halign: "right", fontStyle: "bold" },
            },
            {
              content: `Tk. ${totalMaterials.toLocaleString()}`,
              styles: { fontStyle: "bold" },
            },
            {
              content: `Tk. ${totalTransport.toLocaleString()}`,
              styles: { fontStyle: "bold" },
            },
            {
              content: `Tk. ${totalOthers.toLocaleString()}`,
              styles: { fontStyle: "bold" },
            },
          ],
          [
            {
              content: "GRAND TOTAL",
              colSpan: 3,
              styles: { halign: "right", fontStyle: "bold" },
            },
            {
              content: `Tk. ${grandTotal.toLocaleString()}`,
              colSpan: 3,
              styles: {
                halign: "center",
                fontStyle: "bold",
                fillColor: [255, 243, 224],
              },
            },
          ],
        ],
        theme: "striped",
        headStyles: { fillColor: [79, 195, 247] },
        styles: { textColor: [40, 40, 40] },
      });
    }

    addFooterToPDF(doc);

    // Handle PDF for Android/Capacitor
    const companyPrefix = pdfSettings.companyName
      .replace(/\s+/g, "_")
      .toLowerCase();
    const dateStr = new Date().toISOString().split("T")[0];
    const fileName = `${companyPrefix}_expense_report_${dateStr}.pdf`;
    try {
      // Check if we are in a Capacitor environment
      const isCapacitor = (window as any).Capacitor?.isNativePlatform();

      if (isCapacitor) {
        const pdfBase64 = doc.output("datauristring").split(",")[1];
        const result = await Filesystem.writeFile({
          path: fileName,
          data: pdfBase64,
          directory: Directory.Cache, // Use Cache for temporary files
        });

        await Share.share({
          title: "Expense Report",
          text: "Here is your expense report",
          url: result.uri,
          dialogTitle: "Share PDF",
        });
      } else {
        doc.save(fileName);
      }
    } catch (e) {
      console.error("PDF Generation Error:", e);
      doc.save(fileName);
    }
  };

  const addFooterToPDF = (doc: jsPDF) => {
    const pageCount = (doc as any).internal.getNumberOfPages();
    const hexToRgb = (hex: string) => {
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      return result
        ? [
            parseInt(result[1], 16),
            parseInt(result[2], 16),
            parseInt(result[3], 16),
          ]
        : [0, 0, 0];
    };
    const footerTextRgb = hexToRgb(pdfSettings.footerTextColor);
    const footerBgRgb = hexToRgb(pdfSettings.footerBgColor);

    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);

      if (pdfSettings.footerBgColor.toUpperCase() !== "#FFFFFF") {
        doc.setFillColor(footerBgRgb[0], footerBgRgb[1], footerBgRgb[2]);
        doc.rect(0, 280, 210, 17, "F");
      }

      doc.setFontSize(8);
      doc.setTextColor(footerTextRgb[0], footerTextRgb[1], footerTextRgb[2]);
      doc.setFont(pdfSettings.fontStyle, "normal");
      doc.text(
        `Address: ${pdfSettings.address} Email: ${pdfSettings.email}`,
        105,
        287,
        { align: "center" },
      );
      doc.text(`Contact: ${pdfSettings.contact}`, 105, 292, {
        align: "center",
      });
    }
  };

  const handleLocalBackup = async () => {
    const data = {
      payments,
      projectExpenses,
      bills,
      tomorrowWorkData,
      nextBillNumber,
      nextQuotationNumber,
      exportDate: new Date().toISOString(),
      version: "1.1",
    };
    const jsonString = JSON.stringify(data, null, 2);
    const fileName = `tracker_backup_${new Date().getTime()}.json`;

    try {
      const isCapacitor = (window as any).Capacitor?.isNativePlatform();

      if (isCapacitor) {
        const result = await Filesystem.writeFile({
          path: fileName,
          data: jsonString,
          directory: Directory.Cache,
          encoding: Encoding.UTF8,
        });

        await Share.share({
          title: "Data Backup",
          text: "Your payment tracker data backup",
          url: result.uri,
          dialogTitle: "Save Backup File",
        });
      } else {
        const blob = new Blob([jsonString], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }
    } catch (e) {
      console.error("Backup Error:", e);
      const blob = new Blob([jsonString], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
  };

  const handleLocalRestore = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const data = JSON.parse(content);

        if (data.payments && data.projectExpenses) {
          // Use custom UI or just proceed since we are in an iframe and window.confirm might be tricky,
          // but the user already has it here. I'll keep the logic but add the new fields.
          if (
            window.confirm(
              "Are you sure you want to restore this backup? This will overwrite your current data.",
            )
          ) {
            setPayments(data.payments);
            setProjectExpenses(data.projectExpenses);

            if (data.bills) {
              setBills(data.bills);
              localStorage.setItem("bills", JSON.stringify(data.bills));
            }
            if (data.tomorrowWorkData) {
              setTomorrowWorkData(data.tomorrowWorkData);
              localStorage.setItem(
                "tomorrowWorkData",
                JSON.stringify(data.tomorrowWorkData),
              );
            }
            if (data.nextBillNumber) {
              setNextBillNumber(data.nextBillNumber);
              localStorage.setItem(
                "nextBillNumber",
                data.nextBillNumber.toString(),
              );
            }
            if (data.nextQuotationNumber) {
              setNextQuotationNumber(data.nextQuotationNumber);
              localStorage.setItem(
                "nextQuotationNumber",
                data.nextQuotationNumber.toString(),
              );
            }

            localStorage.setItem("payments", JSON.stringify(data.payments));
            localStorage.setItem(
              "projectExpenses",
              JSON.stringify(data.projectExpenses),
            );

            alert("Data restored successfully!");
            onBack();
          }
        } else {
          alert("Invalid backup file format.");
        }
      } catch (err) {
        alert("Error reading backup file.");
      }
    };
    reader.readAsText(file);
    // Reset input
    event.target.value = "";
  };

  const exportToCSV = async () => {
    let csvContent = "Date,ID,Category,Name,Project,Amount,Transport,Total\n";

    if (includeEmployee) {
      payments.forEach((p) => {
        csvContent += `${p.timestamp},${p.uniqueId},Employee Payment,"${p.employeeName}","${p.projectName}",${p.payment},${p.transport || 0},${p.payment + (p.transport || 0)}\n`;
      });
    }

    if (includeEmployeeTotals) {
      csvContent += "\nEmployee Totals\n";
      csvContent += "Name,Payment,Transport,Total\n";
      const totals: Record<
        string,
        { name: string; payment: number; transport: number; total: number }
      > = {};
      payments.forEach((p) => {
        const key = p.employeeName.trim().toLowerCase();
        if (!totals[key])
          totals[key] = {
            name: p.employeeName,
            payment: 0,
            transport: 0,
            total: 0,
          };
        totals[key].payment += p.payment;
        totals[key].transport += p.transport || 0;
        totals[key].total += p.payment + (p.transport || 0);
      });
      Object.values(totals).forEach((e) => {
        csvContent += `"${e.name}",${e.payment},${e.transport},${e.total}\n`;
      });
    }

    if (includeMaterials) {
      csvContent += "\nMaterials Cost\n";
      projectExpenses.forEach((p) => {
        csvContent += `${p.timestamp},${p.uniqueId},Materials,N/A,"${p.projectName}",${p.materialsCost},0,${p.materialsCost}\n`;
        csvContent += `${p.timestamp},${p.uniqueId},Transport,N/A,"${p.projectName}",${p.transportCost},0,${p.transportCost}\n`;
        csvContent += `${p.timestamp},${p.uniqueId},Others,N/A,"${p.projectName}",${p.othersCost},0,${p.othersCost}\n`;
      });
    }

    const fileName = `expense_data_${new Date().getTime()}.csv`;

    try {
      const isCapacitor = (window as any).Capacitor?.isNativePlatform();

      if (isCapacitor) {
        const result = await Filesystem.writeFile({
          path: fileName,
          data: csvContent,
          directory: Directory.Cache,
          encoding: Encoding.UTF8,
        });

        await Share.share({
          title: "Excel Data",
          text: "Your expense data in CSV format",
          url: result.uri,
          dialogTitle: "Save CSV File",
        });
      } else {
        const blob = new Blob([csvContent], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }
    } catch (e) {
      console.error("CSV Export Error:", e);
      const blob = new Blob([csvContent], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <button onClick={onBack} className="p-1">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h2 className="text-xl font-bold border-b-2 border-[#0D47A1] inline-block pb-1 text-[#FF8F00]">
          Backup & Export
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* PDF Export Section */}
        <div className="bg-white p-6 rounded-xl shadow-md border border-[#B0BEC5] flex flex-col">
          <div className="flex items-center gap-2 text-[#1A237E] mb-4">
            <Download className="w-5 h-5" />
            <h3 className="font-bold">PDF Report</h3>
          </div>

          <p className="text-xs text-[#455A64] mb-4 flex-grow">
            এটি একটি ডকুমেন্ট ফাইল। এটি আপনি সরাসরি প্রিন্ট করতে পারবেন বা গুগল
            ড্রাইভে সেভ করে যে কাউকে পাঠাতে পারবেন।
          </p>

          <div className="space-y-3 mb-6">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={includeEmployee}
                onChange={(e) => setIncludeEmployee(e.target.checked)}
                className="accent-[#0D47A1]"
              />
              Employee Cost
            </label>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={includeEmployeeTotals}
                onChange={(e) => setIncludeEmployeeTotals(e.target.checked)}
                className="accent-[#0D47A1]"
              />
              Employee Payment Details
            </label>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={includeMaterials}
                onChange={(e) => setIncludeMaterials(e.target.checked)}
                className="accent-[#0D47A1]"
              />
              Materials Cost
            </label>
          </div>

          <button
            onClick={generatePDF}
            disabled={
              !includeEmployee && !includeMaterials && !includeEmployeeTotals
            }
            className="w-full bg-[#0D47A1] text-white font-bold py-3 rounded-lg hover:bg-[#0A3D8B] transition-colors disabled:bg-[#B0BEC5] flex items-center justify-center gap-2"
          >
            <Download className="w-4 h-4" />
            Generate PDF
          </button>
        </div>

        {/* CSV Export Section */}
        <div className="bg-white p-6 rounded-xl shadow-md border border-[#B0BEC5] flex flex-col">
          <div className="flex items-center gap-2 text-[#2E7D32] mb-4">
            <FileSpreadsheet className="w-5 h-5" />
            <h3 className="font-bold">Excel (CSV)</h3>
          </div>

          <p className="text-xs text-[#455A64] mb-4 flex-grow">
            এটি এক্সেল ফাইল। এটি গুগল ড্রাইভে সেভ করলে আপনি **Google Sheets**
            দিয়ে ওপেন করে সব হিসাব দেখতে ও এডিট করতে পারবেন।
          </p>

          <button
            onClick={exportToCSV}
            className="w-full bg-[#2E7D32] text-white font-bold py-3 rounded-lg hover:bg-[#1B5E20] transition-colors flex items-center justify-center gap-2 mt-auto"
          >
            <FileSpreadsheet className="w-4 h-4" />
            Export to Excel
          </button>
        </div>

        {/* JSON Backup Section */}
        <div className="bg-white p-6 rounded-xl shadow-md border border-[#B0BEC5] flex flex-col">
          <div className="flex items-center gap-2 text-[#455A64] mb-4">
            <FileJson className="w-5 h-5" />
            <h3 className="font-bold">Local Backup</h3>
          </div>

          <p className="text-xs text-[#455A64] mb-4 flex-grow">
            এটি শুধুমাত্র অ্যাপের জন্য। এটি সরাসরি ওপেন করা যায় না। এটি দিয়ে
            আপনি ডাটা রিস্টোর (Restore) করতে পারবেন।
          </p>

          <div className="space-y-3 mt-auto">
            <button
              onClick={handleLocalBackup}
              className="w-full bg-[#455A64] text-white py-3 rounded-lg font-bold hover:bg-[#263238] transition-colors flex items-center justify-center gap-2"
            >
              <Download className="w-4 h-4" />
              Backup Data
            </button>

            <div className="relative">
              <input
                type="file"
                accept=".json"
                onChange={handleLocalRestore}
                className="hidden"
                id="restore-file"
              />
              <label
                htmlFor="restore-file"
                className="w-full bg-white text-[#455A64] border-2 border-[#455A64] py-3 rounded-lg font-bold hover:bg-[#F5F5F5] transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <Upload className="w-4 h-4" />
                Restore Data
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function AboutView({
  onBack,
  onContactClick,
}: {
  onBack: () => void;
  onContactClick: () => void;
}) {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <button
          onClick={onBack}
          className="p-1 hover:bg-[#F5F5F5] rounded-full transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h2 className="text-xl font-bold border-b-2 border-[#0D47A1] inline-block pb-1 text-[#FF8F00]">
          About Me
        </h2>
      </div>

      <div className="bg-white p-8 rounded-xl shadow-md border border-[#B0BEC5] text-center space-y-6">
        <div className="w-32 h-32 mx-auto relative flex items-center justify-center">
          <div className="absolute inset-0 bg-[#0D47A1] rounded-full blur-md opacity-20 animate-pulse" />
          <div className="w-full h-full rounded-full bg-[#E3F2FD] border-4 border-[#0D47A1] relative z-10 flex items-center justify-center overflow-hidden">
            <img
              src="/user_photo.jpg"
              alt="Bijoy Mahmud Munna"
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
              onError={(e) => {
                // If photo is missing, hide the image and show the User icon
                (e.target as HTMLImageElement).style.display = "none";
                const parent = (e.target as HTMLElement).parentElement;
                if (parent) {
                  const icon = parent.querySelector(".user-icon");
                  if (icon) (icon as HTMLElement).style.display = "flex";
                }
              }}
              onLoad={(e) => {
                // If photo loads, hide the icon
                const parent = (e.target as HTMLElement).parentElement;
                if (parent) {
                  const icon = parent.querySelector(".user-icon");
                  if (icon) (icon as HTMLElement).style.display = "none";
                }
              }}
            />
            <div className="user-icon hidden items-center justify-center w-full h-full">
              <User className="w-16 h-16 text-[#0D47A1]" />
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <h3 className="text-2xl font-bold text-[#1A237E]">
            Bijoy Mahmud Munna
          </h3>
          <div className="flex justify-center">
            <span className="px-4 py-1 bg-[#E3F2FD] text-[#0D47A1] text-xs font-bold rounded-full border border-[#0D47A1]/20 shadow-sm">
              Lead Developer
            </span>
          </div>
        </div>

        <div className="h-px bg-[#B0BEC5]/30 w-full" />

        <p className="text-sm text-[#455A64] leading-relaxed max-w-lg mx-auto text-justify">
          I am{" "}
          <span className="font-bold text-[#1A237E]">Bijoy Mahmud Munna</span>,
          the{" "}
          <span className="text-[#0D47A1] font-semibold">Lead Developer</span>{" "}
          at <span className="font-bold text-[#0D47A1]">Mavxon</span>. I
          specialize in crafting high-quality software solutions for various
          companies, helping them optimize their workflows through innovative
          digital tools. This{" "}
          <span className="font-bold text-[#FF8F00]">Project Tracker</span> is a
          testament to that commitment—engineered to provide seamless oversight
          of employee payments, material logistics, and project budgets. My goal
          is to empower businesses with data-driven precision and technical
          excellence.
        </p>

        <div className="flex justify-center gap-4 pt-4">
          <div className="px-4 py-2 bg-[#F5F5F5] rounded-full text-[10px] font-bold text-[#455A64] border border-[#B0BEC5]/20">
            Project Tracker v1.1
          </div>
          <div className="px-4 py-2 bg-[#F5F5F5] rounded-full text-[10px] font-bold text-[#455A64] border border-[#B0BEC5]/20">
            Engineering Excellence
          </div>
        </div>

        <div className="pt-6 flex flex-col items-center gap-4">
          <div className="flex gap-6">
            <a
              href="https://facebook.com/munna.abir.3"
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 bg-[#F8FAFC] rounded-full text-[#64748B] hover:text-[#0D47A1] hover:bg-[#E3F2FD] transition-all shadow-sm"
            >
              <Facebook className="w-5 h-5" />
            </a>
            <a
              href="https://www.linkedin.com/in/bijoy-mahumud-munna-2561181b8"
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 bg-[#F8FAFC] rounded-full text-[#64748B] hover:text-[#0D47A1] hover:bg-[#E3F2FD] transition-all shadow-sm"
            >
              <Linkedin className="w-5 h-5" />
            </a>
            <a
              href="https://github.com/bijoymm"
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 bg-[#F8FAFC] rounded-full text-[#64748B] hover:text-[#0D47A1] hover:bg-[#E3F2FD] transition-all shadow-sm"
            >
              <Github className="w-5 h-5" />
            </a>
            <a
              href="https://www.al-tasmim.net"
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 bg-[#F8FAFC] rounded-full text-[#64748B] hover:text-[#0D47A1] hover:bg-[#E3F2FD] transition-all shadow-sm"
            >
              <Globe className="w-5 h-5" />
            </a>
          </div>

          <button
            onClick={onContactClick}
            className="flex items-center gap-2 px-6 py-2.5 bg-[#0D47A1] text-white rounded-full font-bold text-sm hover:bg-[#1A237E] transition-all shadow-md active:scale-95"
          >
            <Mail className="w-4 h-4" />
            Get In Touch
          </button>
        </div>
      </div>
    </div>
  );
}

  const getManpowerColor = (name: string) => {
    const alphabeticalColors: { [key: string]: string } = {
      'A': '#f44336', 'B': '#e91e63', 'C': '#9c27b0', 'D': '#673ab7',
      'E': '#3f51b5', 'F': '#2196f3', 'G': '#03a9f4', 'H': '#00bcd4',
      'I': '#009688', 'J': '#4caf50', 'K': '#8bc34a', 'L': '#cddc39',
      'M': '#bf360c', 'N': '#ffc107', 'O': '#ff9800', 'P': '#ff5722',
      'Q': '#795548', 'R': '#607d8b', 'S': '#1a237e', 'T': '#1b5e20',
      'U': '#b71c1c', 'V': '#004d40', 'W': '#4a148c', 'X': '#e65100',
      'Y': '#0d47a1', 'Z': '#827717'
    };

    const firstLetter = name.trim().charAt(0).toUpperCase();
    if (alphabeticalColors[firstLetter]) {
      return alphabeticalColors[firstLetter];
    }

    // Fallback hashing for non-alphabetic or missing keys
    const colors = [
      "#0D47A1", "#C62828", "#2E7D32", "#6A1B9A", "#F57C00",
      "#1565C0", "#AD1457", "#4527A0", "#00838F", "#00695C",
      "#37474F", "#D84315",
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % colors.length;
    return colors[index];
  };

function TomorrowWorkView({
  rows,
  setRows,
  manpowerSuggestions,
  setManpowerSuggestions,
  projectSuggestions,
  setProjectSuggestions,
  addressSuggestions,
  setAddressSuggestions,
  workSuggestions,
  setWorkSuggestions,
  date,
  setDate,
  onBack,
  onViewHistory,
  onSave,
  isAdmin,
  isSuperAdmin,
}: {
  rows: TomorrowWorkRow[];
  setRows: React.Dispatch<React.SetStateAction<TomorrowWorkRow[]>>;
  manpowerSuggestions: string[];
  setManpowerSuggestions: React.Dispatch<React.SetStateAction<string[]>>;
  projectSuggestions: string[];
  setProjectSuggestions: React.Dispatch<React.SetStateAction<string[]>>;
  addressSuggestions: string[];
  setAddressSuggestions: React.Dispatch<React.SetStateAction<string[]>>;
  workSuggestions: string[];
  setWorkSuggestions: React.Dispatch<React.SetStateAction<string[]>>;
  date: string;
  setDate: (date: string) => void;
  onBack: () => void;
  onViewHistory: () => void;
  onSave: () => void;
  isAdmin: boolean;
  isSuperAdmin?: boolean;
}) {
  const [activeRowId, setActiveRowId] = useState<string | null>(null);
  const [activeField, setActiveField] = useState<
    "projectName" | "projectAddress" | "workDescription" | "manpower" | null
  >(null);
  const [manpowerInput, setManpowerInput] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);

  const updateRow = (id: string, field: keyof TomorrowWorkRow, value: any) => {
    setRows(
      rows.map((row) => (row.id === id ? { ...row, [field]: value } : row)),
    );
  };

  const addRow = () => {
    setRows([
      ...rows,
      {
        id: generateId(),
        projectName: "",
        projectAddress: "",
        workDescription: "",
        manpowerList: [],
        overtime: "",
        createdByEmail: auth.currentUser?.email || null,
      },
    ]);
  };

  const addManpower = (rowId: string, name: string) => {
    if (!name.trim()) return;
    const trimmedName = name.trim();

    setRows(
      rows.map((row) => {
        if (row.id === rowId) {
          // Case-insensitive duplicate check
          const exists = row.manpowerList.some(
            (m) => m.toLowerCase() === trimmedName.toLowerCase(),
          );
          if (exists) return row;
          return { ...row, manpowerList: [...row.manpowerList, trimmedName] };
        }
        return row;
      }),
    );

    if (
      !manpowerSuggestions.some(
        (s) => s.toLowerCase() === trimmedName.toLowerCase(),
      )
    ) {
      setManpowerSuggestions((prev) => [...prev, trimmedName]);
    }

    setManpowerInput("");
    setShowSuggestions(false);
  };

  const removeManpower = (rowId: string, index: number) => {
    setRows(
      rows.map((row) => {
        if (row.id === rowId) {
          const newList = [...row.manpowerList];
          newList.splice(index, 1);
          return { ...row, manpowerList: newList };
        }
        return row;
      }),
    );
  };

  const removeRow = (id: string) => {
    if (rows.length > 1) {
      setRows(rows.filter((row) => row.id !== id));
    }
  };

  const clearAllRows = () => {
    setRows([
      {
        id: generateId(),
        projectName: "",
        projectAddress: "",
        workDescription: "",
        manpowerList: [],
        overtime: "",
      },
    ]);
    // Reset to today's date in local time (YYYY-MM-DD)
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");
    setDate(`${year}-${month}-${day}`);
  };

  const filteredManpowerSuggestions = manpowerSuggestions.filter(
    (s) =>
      s.toLowerCase().includes(manpowerInput.toLowerCase()) &&
      !rows
        .find((r) => r.id === activeRowId)
        ?.manpowerList.some((m) => m.toLowerCase() === s.toLowerCase()),
  );

  return (
    <div className="space-y-2 pb-64 relative">
      <div className="flex items-center justify-between gap-3 mb-1">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-bold border-b-2 border-[#ED7D31] inline-block pb-1 text-[#ED7D31]">
            WORK SCHEDULE
          </h2>
        </div>
        <div className="flex gap-2">
          <button
            onClick={clearAllRows}
            className="px-3 py-1 text-xs font-bold text-white bg-[#D32F2F] rounded shadow-sm hover:bg-[#B71C1C] transition-colors"
          >
            Clear All
          </button>
          <button
            onClick={onViewHistory}
            className="px-3 py-1 text-xs font-bold text-white bg-[#2E7D32] rounded shadow-sm hover:bg-[#1B5E20] transition-colors flex items-center gap-1"
          >
            <History className="w-3 h-3" /> History
          </button>
        </div>
      </div>

      {/* Floating Add Row Button */}
      <button
        onClick={addRow}
        className="fixed bottom-24 right-6 z-50 w-14 h-14 bg-[#0D47A1] text-white rounded-full shadow-2xl hover:bg-[#1565C0] flex items-center justify-center transition-all hover:scale-110 active:scale-95 border-4 border-white"
        title="Add Row"
      >
        <Plus className="w-8 h-8" />
      </button>

      {/* Date Field Row - Highlighted but no container border */}
      <div className="bg-[#E3F2FD] p-1.5 rounded-lg flex items-center justify-start gap-3">
        <label className="text-[10px] font-black text-[#0D47A1] uppercase tracking-wider">
          Work Date:
        </label>
        <div className="relative flex-1 max-w-[160px]">
          <Calendar className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-[#0D47A1]" />
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full pl-7 pr-2 py-1 text-xs font-bold text-[#0D47A1] border border-[#B0BEC5]/30 rounded focus:ring-1 focus:ring-[#0D47A1] outline-none bg-white"
          />
        </div>
      </div>

      {/* Table View (Responsive) - Compact for screenshots */}
      <div className="bg-white rounded-xl shadow-md border border-[#B0BEC5]/30 overflow-visible">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-[#F5F9FD] border-b border-[#B0BEC5]/30 text-[8px] font-bold text-[#455A64] uppercase tracking-wider">
              <th className="p-1 border-r border-[#B0BEC5]/30 text-center whitespace-nowrap min-w-[25px]">
                SL
              </th>
              <th className="p-1 border-r border-[#B0BEC5]/30 text-center min-w-[80px]">
                Project
              </th>
              <th className="p-1 border-r border-[#B0BEC5]/30 text-center min-w-[80px]">
                Address
              </th>
              <th className="p-1 border-r border-[#B0BEC5]/30 text-center min-w-[100px]">
                Work
              </th>
              <th className="p-1 border-r border-[#B0BEC5]/30 text-center min-w-[150px]">
                Manpower
              </th>
              <th className="p-1 text-center whitespace-nowrap min-w-[35px]">OT</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr
                key={row.id}
                className="border-b border-[#B0BEC5]/20 hover:bg-[#F5F9FD]/50 transition-colors"
              >
                <td className="p-0.5 border-r border-[#B0BEC5]/20 text-center">
                  <div className="flex flex-col items-center gap-0.5">
                    <span className="text-[9px] font-bold text-[#78909C]">
                      {index + 1}
                    </span>
                    {rows.length > 1 && (
                      <button
                        onClick={() => removeRow(row.id)}
                        className="text-red-400 hover:text-red-600 transition-colors"
                      >
                        <X className="w-2.5 h-2.5" />
                      </button>
                    )}
                  </div>
                </td>
                <td className="p-0.5 border-r border-[#B0BEC5]/20 relative">
                  <textarea
                    value={row.projectName}
                    onChange={(e) => {
                      updateRow(row.id, "projectName", e.target.value);
                      setActiveRowId(row.id);
                      setActiveField("projectName");
                      setShowSuggestions(true);
                    }}
                    onFocus={() => {
                      setActiveRowId(row.id);
                      setActiveField("projectName");
                      setShowSuggestions(true);
                    }}
                    onBlur={() =>
                      setTimeout(() => setShowSuggestions(false), 200)
                    }
                    className="w-full p-0.5 text-[9px] border-none focus:ring-1 focus:ring-[#0D47A1] rounded bg-transparent resize-none min-h-[35px] leading-tight"
                    placeholder="Proj..."
                  />
                  {showSuggestions &&
                    activeRowId === row.id &&
                    activeField === "projectName" && (
                      <div className="absolute left-0 right-0 top-full z-50 bg-white border border-[#B0BEC5]/30 shadow-lg rounded-md max-h-32 overflow-y-auto">
                        {projectSuggestions
                          .filter((s) =>
                            s
                              .toLowerCase()
                              .includes(row.projectName.toLowerCase()),
                          )
                          .map((s, i) => (
                            <button
                              key={i}
                              onClick={() => {
                                updateRow(row.id, "projectName", s);
                                setShowSuggestions(false);
                              }}
                              className="w-full text-left px-2 py-1 text-[8px] hover:bg-[#F5F5F5] font-medium text-[#1A237E]"
                            >
                              {s}
                            </button>
                          ))}
                      </div>
                    )}
                </td>
                <td className="p-0.5 border-r border-[#B0BEC5]/20 relative">
                  <textarea
                    value={row.projectAddress}
                    onChange={(e) => {
                      updateRow(row.id, "projectAddress", e.target.value);
                      setActiveRowId(row.id);
                      setActiveField("projectAddress");
                      setShowSuggestions(true);
                    }}
                    onFocus={() => {
                      setActiveRowId(row.id);
                      setActiveField("projectAddress");
                      setShowSuggestions(true);
                    }}
                    onBlur={() =>
                      setTimeout(() => setShowSuggestions(false), 200)
                    }
                    className="w-full p-0.5 text-[9px] border-none focus:ring-1 focus:ring-[#0D47A1] rounded bg-transparent resize-none min-h-[35px] leading-tight"
                    placeholder="Addr..."
                  />
                  {showSuggestions &&
                    activeRowId === row.id &&
                    activeField === "projectAddress" && (
                      <div className="absolute left-0 right-0 top-full z-50 bg-white border border-[#B0BEC5]/30 shadow-lg rounded-md max-h-32 overflow-y-auto">
                        {addressSuggestions
                          .filter((s) =>
                            s
                              .toLowerCase()
                              .includes(row.projectAddress.toLowerCase()),
                          )
                          .map((s, i) => (
                            <button
                              key={i}
                              onClick={() => {
                                updateRow(row.id, "projectAddress", s);
                                setShowSuggestions(false);
                              }}
                              className="w-full text-left px-2 py-1 text-[8px] hover:bg-[#F5F5F5] font-medium text-[#1A237E]"
                            >
                              {s}
                            </button>
                          ))}
                      </div>
                    )}
                </td>
                <td className="p-0.5 border-r border-[#B0BEC5]/20 relative">
                  <textarea
                    value={row.workDescription}
                    onChange={(e) => {
                      updateRow(row.id, "workDescription", e.target.value);
                      setActiveRowId(row.id);
                      setActiveField("workDescription");
                      setShowSuggestions(true);
                    }}
                    onFocus={() => {
                      setActiveRowId(row.id);
                      setActiveField("workDescription");
                      setShowSuggestions(true);
                    }}
                    onBlur={() =>
                      setTimeout(() => setShowSuggestions(false), 200)
                    }
                    className="w-full p-0.5 text-[9px] border-none focus:ring-1 focus:ring-[#0D47A1] rounded bg-transparent resize-none min-h-[35px] leading-tight"
                    placeholder="Work..."
                  />
                  {showSuggestions &&
                    activeRowId === row.id &&
                    activeField === "workDescription" && (
                      <div className="absolute left-0 right-0 top-full z-50 bg-white border border-[#B0BEC5]/30 shadow-lg rounded-md max-h-32 overflow-y-auto">
                        {workSuggestions
                          .filter((s) =>
                            s
                              .toLowerCase()
                              .includes(row.workDescription.toLowerCase()),
                          )
                          .map((s, i) => (
                            <button
                              key={i}
                              onClick={() => {
                                updateRow(row.id, "workDescription", s);
                                setShowSuggestions(false);
                              }}
                              className="w-full text-left px-2 py-1 text-[8px] hover:bg-[#F5F5F5] font-medium text-[#1A237E]"
                            >
                              {s}
                            </button>
                          ))}
                      </div>
                    )}
                </td>
                <td className="p-0.5 border-r border-[#B0BEC5]/20 align-top">
                  <div className="space-y-0.5 p-0.5">
                    <div className="flex flex-wrap gap-1">
                      {row.manpowerList.map((name, mIndex) => (
                        <div
                          key={mIndex}
                          style={{
                            backgroundColor: getManpowerColor(name) + "15",
                            color: getManpowerColor(name),
                            borderColor: getManpowerColor(name) + "30",
                          }}
                          className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[8px] font-bold whitespace-nowrap border w-fit"
                        >
                          <span>
                            {mIndex + 1}.{name}
                          </span>
                          <button
                            onClick={() => removeManpower(row.id, mIndex)}
                            className="hover:text-red-600 shrink-0 ml-0.5"
                          >
                            <X className="w-2 h-2" />
                          </button>
                        </div>
                      ))}
                    </div>
                    <div className="relative">
                      <div className="flex gap-0.5">
                        <input
                          type="text"
                          value={
                            activeRowId === row.id && activeField === "manpower"
                              ? manpowerInput
                              : ""
                          }
                          onChange={(e) => {
                            setActiveRowId(row.id);
                            setActiveField("manpower");
                            setManpowerInput(e.target.value);
                            setShowSuggestions(true);
                          }}
                          onFocus={() => {
                            setActiveRowId(row.id);
                            setActiveField("manpower");
                            setShowSuggestions(true);
                          }}
                          onBlur={() =>
                            setTimeout(() => setShowSuggestions(false), 200)
                          }
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              addManpower(row.id, manpowerInput);
                            }
                          }}
                          placeholder="Add"
                          className="flex-1 p-0.5 text-[8px] border border-[#B0BEC5]/50 rounded focus:ring-1 focus:ring-[#0D47A1] outline-none w-full"
                        />
                        <button
                          onClick={() => {
                            if (manpowerInput) {
                              addManpower(row.id, manpowerInput);
                            } else {
                              setActiveRowId(row.id);
                              setShowSuggestions(!showSuggestions);
                            }
                          }}
                          className="p-0.5 bg-[#0D47A1] text-white rounded hover:bg-[#1565C0] shrink-0"
                        >
                          <Plus className="w-2 h-2" />
                        </button>
                      </div>
                      {activeRowId === row.id &&
                        showSuggestions &&
                        activeField === "manpower" &&
                        (manpowerInput || manpowerSuggestions.length > 0) && (
                          <div className="absolute z-50 left-0 right-0 mt-1 bg-white border border-[#B0BEC5] rounded shadow-2xl max-h-80 overflow-y-auto ring-1 ring-black ring-opacity-5">
                            {(manpowerInput
                              ? filteredManpowerSuggestions
                              : manpowerSuggestions.filter(
                                  (s) =>
                                    !row.manpowerList.some(
                                      (m) =>
                                        m.toLowerCase() === s.toLowerCase(),
                                    ),
                                )
                            ).map((suggestion, sIndex) => (
                              <button
                                key={sIndex}
                                onClick={() => addManpower(row.id, suggestion)}
                                className="w-full text-left px-2 py-1.5 text-[9px] hover:bg-[#F5F9FD] border-b border-[#B0BEC5]/10 last:border-none font-medium text-[#1A237E]"
                              >
                                {suggestion}
                              </button>
                            ))}
                          </div>
                        )}
                    </div>
                  </div>
                </td>
                <td className="p-0.5">
                  <textarea
                    value={row.overtime}
                    onChange={(e) =>
                      updateRow(row.id, "overtime", e.target.value)
                    }
                    className="w-full p-0.5 text-[9px] border-none focus:ring-1 focus:ring-[#0D47A1] rounded bg-transparent resize-none min-h-[35px] leading-tight"
                    placeholder="OT..."
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* View Button at the bottom */}
      <div className="pt-4 flex justify-center">
        <button
          onClick={onSave}
          className="w-full max-w-md py-3 bg-[#7B1FA2] text-white font-bold rounded-xl shadow-lg hover:bg-[#4A148C] transition-all flex items-center justify-center gap-2 active:scale-95"
        >
          <Eye className="w-5 h-5" /> View & Save Record
        </button>
      </div>
    </div>
  );
}

function TomorrowWorkHistoryView({
  data,
  onBack,
  onSelectDate,
  onDeleteDate,
  isAdmin,
}: {
  data: { [date: string]: TomorrowWorkRow[] };
  onBack: () => void;
  onSelectDate: (date: string) => void;
  onDeleteDate: (date: string) => void;
  isAdmin: boolean;
}) {
  const dates = Object.keys(data).sort((a, b) => b.localeCompare(a));

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <button
          onClick={onBack}
          className="p-1 hover:bg-[#F5F5F5] rounded-full transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h2 className="text-xl font-bold border-b-2 border-[#ED7D31] inline-block pb-1 text-[#ED7D31]">
          Work History
        </h2>
      </div>

      <div className="grid grid-cols-1 gap-3">
        {dates.map((date) => (
          <div
            key={date}
            className="bg-white rounded-xl shadow-sm border border-[#B0BEC5]/30 flex items-center overflow-hidden hover:border-[#ED7D31] transition-colors group"
          >
            <button
              onClick={() => onSelectDate(date)}
              className="flex-1 p-4 flex items-center justify-between text-left"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#E3F2FD] flex items-center justify-center text-[#0D47A1]">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-bold text-[#1A237E]">{date}</p>
                  <p className="text-[10px] text-[#78909C] font-medium">
                    {data[date].length} Projects recorded
                  </p>
                </div>
              </div>
              <ArrowLeft className="w-4 h-4 text-[#B0BEC5] rotate-180 group-hover:translate-x-1 transition-transform" />
            </button>
            {isAdmin && (
              <button
                onClick={() => onDeleteDate(date)}
                className="p-4 text-[#B0BEC5] hover:text-red-600 hover:bg-red-50 transition-colors border-l border-[#B0BEC5]/10"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            )}
          </div>
        ))}
        {dates.length === 0 && (
          <div className="text-center p-12 bg-white rounded-2xl border-2 border-dashed border-[#B0BEC5]/30">
            <Calendar className="w-12 h-12 text-[#B0BEC5] mx-auto mb-3 opacity-20" />
            <p className="text-[#78909C] font-bold">No history found</p>
            <p className="text-[10px] text-[#90A4AE] mt-1">
              Recorded work will appear here
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function TomorrowWorkDetailsView({
  rows,
  date,
  onBack,
  isSuperAdmin,
}: {
  rows: TomorrowWorkRow[];
  date: string;
  onBack: () => void;
  isSuperAdmin?: boolean;
}) {
  const tableRef = React.useRef<HTMLDivElement>(null);

  const saveAsImage = async () => {
    if (!tableRef.current) return;

    try {
      const dataUrl = await toJpeg(tableRef.current, {
        quality: 0.95,
        backgroundColor: "#ffffff",
      });
      const link = document.createElement("a");
      link.download = `work_schedule_${date}.jpg`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error("Could not save image", err);
      alert("Failed to save image. Please try again.");
    }
  };

  return (
    <div className="fixed inset-0 bg-white z-50 flex flex-col overflow-hidden">
      <div className="p-4 border-b border-[#B0BEC5]/30 flex items-center justify-between bg-white sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 hover:bg-[#F5F5F5] rounded-full transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-6 h-6 text-[#1A237E]" />
          </button>
          <h2 className="text-xl font-bold text-[#1A237E]">
            Work Date - {date}
          </h2>
        </div>
        <button
          onClick={saveAsImage}
          className="flex items-center gap-2 px-4 py-2 bg-[#2E7D32] text-white rounded-lg text-sm font-bold shadow-md hover:bg-[#1B5E20] transition-all active:scale-95 cursor-pointer"
        >
          <Camera className="w-4 h-4" />
          Save as JPG
        </button>
      </div>

      <div className="flex-1 overflow-auto p-4 bg-slate-50">
        <div
          ref={tableRef}
          className="bg-white p-4 rounded-xl shadow-md border border-[#B0BEC5]/30 overflow-hidden min-w-[800px]"
        >
          <div className="mb-4 flex justify-between items-end border-b pb-2">
            <div>
              <h1 className="text-2xl font-black text-[#1A237E]">Al-Tasmim</h1>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                Interior Design & Consultant
              </p>
            </div>
            <div className="text-right">
              <h3 className="text-sm font-bold text-[#1A237E]">Work Schedule</h3>
              <p className="text-xs text-slate-500">Date: {date}</p>
            </div>
          </div>
          <table className="w-full text-left border-collapse border border-[#B0BEC5]/30">
            <thead>
              <tr className="bg-[#F5F9FD] border-b border-[#B0BEC5]/30 text-[10px] font-bold text-[#455A64] uppercase tracking-wider">
                <th className="p-2 border-r border-[#B0BEC5]/30 text-center whitespace-nowrap min-w-[30px]">
                  SL
                </th>
                <th className="p-2 border-r border-[#B0BEC5]/30 min-w-[120px]">
                  Project
                </th>
                <th className="p-2 border-r border-[#B0BEC5]/30 min-w-[120px]">
                  Address
                </th>
                {isSuperAdmin && (
                  <th className="p-2 border-r border-[#B0BEC5]/30 min-w-[100px]">
                    Created By
                  </th>
                )}
                <th className="p-2 border-r border-[#B0BEC5]/30 min-w-[150px]">
                  Work Description
                </th>
                <th className="p-2 border-r border-[#B0BEC5]/30 min-w-[200px]">
                  Manpower
                </th>
                <th className="p-2 text-center whitespace-nowrap min-w-[40px]">OT</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr
                  key={row.id}
                  className="border-b border-[#B0BEC5]/20 hover:bg-[#F5F9FD]/30 transition-colors"
                >
                  <td className="p-2 border-r border-[#B0BEC5]/20 text-center text-[11px] font-bold text-[#78909C]">
                    {index + 1}
                  </td>
                  <td className="p-2 border-r border-[#B0BEC5]/20 text-[11px] font-medium text-[#1A237E] break-words">
                    {row.projectName || "N/A"}
                  </td>
                  <td className="p-2 border-r border-[#B0BEC5]/20 text-[11px] font-medium text-[#455A64] break-words">
                    {row.projectAddress || "N/A"}
                  </td>
                  {isSuperAdmin && (
                    <td className="p-2 border-r border-[#B0BEC5]/20 text-[10px] text-[#78909C] break-words">
                      {row.createdByEmail || "-"}
                    </td>
                  )}
                  <td className="p-2 border-r border-[#B0BEC5]/20 text-[11px] font-medium text-[#455A64] break-words whitespace-pre-wrap">
                    {row.workDescription || "N/A"}
                  </td>
                  <td className="p-2 border-r border-[#B0BEC5]/20">
                    <div className="flex flex-wrap gap-1">
                      {row.manpowerList.length > 0 ? (
                        row.manpowerList.map((name, mIndex) => (
                          <span
                            key={mIndex}
                            style={{
                              backgroundColor: getManpowerColor(name) + "15",
                              color: getManpowerColor(name),
                              borderColor: getManpowerColor(name) + "30",
                            }}
                            className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-bold whitespace-nowrap border w-fit"
                          >
                            {mIndex + 1}. {name}
                          </span>
                        ))
                      ) : (
                        <span className="text-[9px] text-[#90A4AE] italic">
                          None
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="p-2 text-center text-[11px] font-bold text-[#2E7D32]">
                    {row.overtime || "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function ContactInfoView({ onBack }: { onBack: () => void }) {
  const contactLinks = [
    {
      icon: <Phone className="w-5 h-5" />,
      label: "Phone",
      value: "+880 1682799198",
      href: "tel:+8801682799198",
      cta: "Call Now",
      color: "text-green-600",
      bg: "bg-green-50",
    },
    {
      icon: <Mail className="w-5 h-5" />,
      label: "Email",
      value: "Bijoy.mm112@gmail.com",
      href: "mailto:Bijoy.mm112@gmail.com",
      cta: "Send Mail",
      color: "text-red-600",
      bg: "bg-red-50",
    },
    {
      icon: <Globe className="w-5 h-5" />,
      label: "Website",
      value: "www.al-tasmim.net",
      href: "https://www.al-tasmim.net",
      cta: "Visit",
      color: "text-blue-600",
      bg: "bg-blue-50",
    },
    {
      icon: <Facebook className="w-5 h-5" />,
      label: "Facebook",
      value: "facebook.com/munna.abir.3",
      href: "https://facebook.com/munna.abir.3",
      cta: "Visit",
      color: "text-blue-800",
      bg: "bg-blue-100",
    },
    {
      icon: <Linkedin className="w-5 h-5" />,
      label: "LinkedIn",
      value: "linkedin.com/in/bijoy-mahumud-munna-2561181b8",
      href: "https://www.linkedin.com/in/bijoy-mahumud-munna-2561181b8",
      cta: "Connect",
      color: "text-blue-700",
      bg: "bg-blue-50",
    },
    {
      icon: <Github className="w-5 h-5" />,
      label: "GitHub",
      value: "github.com/bijoymm",
      href: "https://github.com/bijoymm",
      cta: "Follow",
      color: "text-gray-900",
      bg: "bg-gray-100",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <button
          onClick={onBack}
          className="p-2 hover:bg-gray-100 rounded-full transition-colors"
        >
          <ArrowLeft className="w-6 h-6 text-[#1A237E]" />
        </button>
        <h2 className="text-xl font-bold border-b-2 border-[#0D47A1] inline-block pb-1">
          Contact Info
        </h2>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {contactLinks.map((link, index) => (
          <motion.a
            key={index}
            href={link.href}
            target={link.href.startsWith("http") ? "_blank" : undefined}
            rel={
              link.href.startsWith("http") ? "noopener noreferrer" : undefined
            }
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className="flex items-center gap-4 p-4 bg-white rounded-xl border border-[#B0BEC5]/30 shadow-sm hover:shadow-md hover:border-[#0D47A1]/50 transition-all active:scale-95 group relative overflow-hidden"
          >
            <div
              className={`w-12 h-12 ${link.bg} ${link.color} rounded-lg flex items-center justify-center group-hover:scale-110 group-hover:rotate-3 transition-all duration-300`}
            >
              {link.icon}
            </div>
            <div className="flex-1">
              <p className="text-[10px] font-bold text-[#78909C] uppercase tracking-wider">
                {link.label}
              </p>
              <p className="text-sm font-bold text-[#1A237E] truncate pr-16">
                {link.value}
              </p>
            </div>

            {/* CTA Badge - Visible on Hover */}
            <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-4 group-hover:translate-x-0">
              <span
                className={`px-3 py-1 rounded-full text-[10px] font-bold ${link.bg} ${link.color} border border-current`}
              >
                {link.cta}
              </span>
            </div>
          </motion.a>
        ))}
      </div>

      <div className="p-6 bg-[#F5F9FD] rounded-2xl border border-[#B0BEC5]/30 text-center">
        <p className="text-xs text-[#455A64] font-medium italic">
          "Building digital experiences with passion and precision."
        </p>
      </div>
    </div>
  );
}

function CloudSyncView({
  payments,
  projectExpenses,
  onBack,
}: {
  payments: EmployeePayment[];
  projectExpenses: ProjectExpense[];
  onBack: () => void;
}) {
  const defaultEmail = "bijoy.mm112@gmail.com";

  const handleBackupAndEmail = () => {
    try {
      const data = {
        payments,
        projectExpenses,
        exportDate: new Date().toISOString(),
      };

      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `backup_${new Date().toISOString().split("T")[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setTimeout(() => {
        window.open(
          `mailto:${defaultEmail}?subject=App Backup Data&body=Please find the downloaded backup JSON file attached to this email for safekeeping.`,
          "_blank",
        );
      }, 500);
    } catch (e) {
      console.error(e);
      alert("Failed to create backup file.");
    }
  };

  return (
    <div className="space-y-6 pb-20">
      <div className="flex items-center gap-2">
        <button
          onClick={onBack}
          className="p-1 hover:bg-[#F5F5F5] rounded-full transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h2 className="text-xl font-bold border-b-2 border-[#0D47A1] inline-block pb-1 text-[#FF8F00]">
          Backup & Protection
        </h2>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-md border border-[#B0BEC5] space-y-6">
        <div className="flex flex-col items-center text-center space-y-4">
          <div className="w-16 h-16 rounded-full flex items-center justify-center bg-blue-100">
            <Cloud className="w-8 h-8 text-[#0D47A1]" />
          </div>

          <div className="space-y-3">
            <h3 className="font-bold text-lg text-green-700 flex items-center justify-center gap-2">
              <ShieldCheck className="w-6 h-6" /> Cloud Auto-Save Active
            </h3>
            <p className="text-sm font-bold text-[#455A64]">
              আপনার অ্যাপের সব ডেটা স্বয়ংক্রিয়ভাবে ফায়ারবেস ক্লাউডে সেভ
              হচ্ছে। অ্যাপ ক্র্যাশ করলেও কোনো ডেটা হারাবে না।
            </p>
            <div className="bg-[#F5F9FD] p-4 rounded-lg border border-blue-100 mt-2 text-left space-y-2">
              <p className="text-xs text-[#1A237E] font-medium leading-relaxed">
                <span className="font-bold text-red-600">
                  Daily Backup Note:
                </span>{" "}
                ব্রাউজার থেকে ব্যাকগ্রাউন্ডে ইনভিজিবল/অটোমেটিক ইমেইল বা গুগল
                ড্রাইভে সেভ করা সিকিউরিটির জন্য সম্ভব নয়।
              </p>
              <p className="text-xs text-[#1A237E] font-medium leading-relaxed">
                তবে, অতিরিক্ত নিরাপত্তার জন্য আপনি <strong>Export Data</strong>{" "}
                পেজ থেকে Backup JSON ফাইল ডাউনলোড করে{" "}
                <a
                  href={`mailto:${defaultEmail}?subject=Daily App Backup`}
                  className="text-blue-600 underline font-bold"
                >
                  {defaultEmail}
                </a>{" "}
                তে ইমেইল করে রাখতে পারেন।
              </p>
            </div>
          </div>
        </div>

        <div className="border-t border-[#B0BEC5] pt-6 flex flex-col gap-3 items-center">
          <button
            onClick={handleBackupAndEmail}
            className="w-full py-3 px-6 bg-[#0D47A1] text-white font-bold rounded-lg shadow hover:bg-blue-800 transition-colors flex items-center justify-center gap-2"
          >
            <Cloud className="w-5 h-5" />
            Send Backup to {defaultEmail}
          </button>
        </div>
      </div>
    </div>
  );
}

// --- Bill & Quotation Helpers ---

const numberToWords = (num: number): string => {
  const a = [
    "",
    "One",
    "Two",
    "Three",
    "Four",
    "Five",
    "Six",
    "Seven",
    "Eight",
    "Nine",
    "Ten",
    "Eleven",
    "Twelve",
    "Thirteen",
    "Fourteen",
    "Fifteen",
    "Sixteen",
    "Seventeen",
    "Eighteen",
    "Nineteen",
  ];
  const b = [
    "",
    "",
    "Twenty",
    "Thirty",
    "Forty",
    "Fifty",
    "Sixty",
    "Seventy",
    "Eighty",
    "Ninety",
  ];

  const inWords = (n: number): string => {
    if (n < 20) return a[n];
    if (n < 100)
      return b[Math.floor(n / 10)] + (n % 10 !== 0 ? " " + a[n % 10] : "");
    if (n < 1000)
      return (
        a[Math.floor(n / 100)] +
        " Hundred" +
        (n % 100 !== 0 ? " " + inWords(n % 100) : "")
      );
    if (n < 100000)
      return (
        inWords(Math.floor(n / 1000)) +
        " Thousand" +
        (n % 1000 !== 0 ? " " + inWords(n % 1000) : "")
      );
    if (n < 10000000)
      return (
        inWords(Math.floor(n / 100000)) +
        " Lakh" +
        (n % 100000 !== 0 ? " " + inWords(n % 100000) : "")
      );
    return "";
  };

  return inWords(Math.floor(num)) + " Taka Only";
};

const generateBillPDF = async (
  bill: Bill,
  action: "download" | "view" | "blob" | "share" | "bloburl" = "download",
  settings: PDFSettings = DEFAULT_PDF_SETTINGS,
) => {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  // Helper to convert hex to RGB
  const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? [
          parseInt(result[1], 16),
          parseInt(result[2], 16),
          parseInt(result[3], 16),
        ]
      : [0, 0, 0];
  };

  const headerBgRgb = hexToRgb(settings.headerBgColor);
  const headerTextRgb = hexToRgb(settings.headerTextColor);
  const footerBgRgb = hexToRgb(settings.footerBgColor);
  const footerTextRgb = hexToRgb(settings.footerTextColor);

  const addPageDecorations = (data: any) => {
    // Watermark
    doc.setTextColor(220, 220, 220);
    doc.setFontSize(55);
    doc.setFont(settings.fontStyle, "bold");
    doc.saveGraphicsState();
    doc.setGState(new (doc as any).GState({ opacity: 0.12 }));
    doc.text(settings.companyName, 155, 230, { align: "center", angle: 45 });
    doc.restoreGraphicsState();

    // Header Background
    if (settings.headerBgColor.toUpperCase() !== "#FFFFFF") {
      doc.setFillColor(headerBgRgb[0], headerBgRgb[1], headerBgRgb[2]);
      doc.rect(0, 0, 210, 35, "F");
    }

    // Logo
    if (settings.logo) {
      try {
        const isWideLogo = settings.hideNameText;
        const logoWidth = isWideLogo ? 160 : 40;
        const logoHeight = isWideLogo ? 13.33 : 13.33;
        const logoX = isWideLogo ? (210 - logoWidth) / 2 : 20;
        const logoY = isWideLogo ? 10 : 10;
        doc.addImage(settings.logo, "PNG", logoX, logoY, logoWidth, logoHeight);
      } catch (e) {
        console.error("Error adding logo to PDF", e);
      }
    }

    // Header Text
    if (!settings.hideNameText) {
      doc.setTextColor(headerTextRgb[0], headerTextRgb[1], headerTextRgb[2]);
      doc.setFontSize(24);
      doc.setFont(settings.fontStyle, "bold");
      const nameX = settings.logo ? 60 : 105;
      const textAlign = settings.logo ? "left" : "center";
      doc.text(settings.companyName, nameX, 22, { align: textAlign });
    }

    // Footer Background
    if (settings.footerBgColor.toUpperCase() !== "#FFFFFF") {
      doc.setFillColor(footerBgRgb[0], footerBgRgb[1], footerBgRgb[2]);
      doc.rect(0, 280, 210, 17, "F");
    }

    // Footer Text
    doc.setTextColor(footerTextRgb[0], footerTextRgb[1], footerTextRgb[2]);
    doc.setFontSize(8);
    doc.setFont(settings.fontStyle, "normal");
    doc.text(
      `Address: ${settings.address} Email: ${settings.email}`,
      105,
      287,
      { align: "center" },
    );
    doc.text(`Contact: ${settings.contact}`, 105, 292, { align: "center" });

    // Page Num
    if (data) {
      doc.text(`Page ${data.pageNumber}`, 190, 292, { align: "right" });
    }
  };

  // Add for first page early so it goes under standard text
  addPageDecorations(null);

  // Info
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(10);
  doc.setFont(settings.fontStyle, "normal");
  doc.text(`To,`, 20, 28);
  doc.text(`Dear Sir,`, 20, 33);
  doc.setFont(settings.fontStyle, "bold");
  doc.text(bill.recipientName, 20, 38);

  doc.setFont(settings.fontStyle, "normal");
  doc.text(
    `Date: ${new Date(bill.date).toLocaleDateString("en-GB")}`,
    190,
    28,
    { align: "right" },
  );
  doc.setFont(settings.fontStyle, "bold");
  doc.text(
    `${bill.type === "BILL" ? "Bill No" : "Quote No"}: ${bill.billNumber}${bill.revision && bill.revision > 0 ? ` (${bill.revision})` : ""}`,
    190,
    33,
    { align: "right" },
  );

  // Bill/Quotation Title in middle
  doc.setFontSize(16);
  doc.setFont(settings.fontStyle, "bold");
  doc.text(bill.type, 105, 44, { align: "center" });

  // Underline for Title
  const titleWidth = doc.getTextWidth(bill.type);
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.5);
  doc.line(105 - titleWidth / 2, 46, 105 + titleWidth / 2, 46);

  doc.setFontSize(10);
  doc.setFont(settings.fontStyle, "bold");
  doc.text(`Site: `, 20, 52);
  doc.setFont(settings.fontStyle, "normal");
  doc.text(bill.site, 30, 52);

  doc.setFont(settings.fontStyle, "bold");
  doc.text(`Sub: `, 20, 56);
  doc.text(bill.subject, 30, 56);

  // Check empty columns
  const hasAreaName = bill.items.some((i) => i.areaName?.trim() !== "");
  const hasTiles = bill.items.some((i) => i.tiles?.trim() !== "");
  const hasQty = bill.items.some((i) => i.qty > 0);
  const hasUnit = bill.items.some((i) => i.unit?.trim() !== "");
  const hasPrice = bill.items.some((i) => i.price > 0);

  const columns = [];
  columns.push({ header: "SL", width: 10, align: "center" });
  if (hasAreaName)
    columns.push({ header: "Area Name", width: 30, align: "center" });
  if (hasTiles) columns.push({ header: "Tiles", width: "auto", align: "left" });
  if (hasQty) columns.push({ header: "Qty", width: 15, align: "center" });
  if (hasUnit) columns.push({ header: "Unit", width: 15, align: "center" });
  if (hasPrice) columns.push({ header: "Price", width: 20, align: "center" });
  columns.push({ header: "Total", width: 30, align: "right" });

  const tableData = bill.items.map((item, index) => {
    const row = [];
    row.push(index + 1);
    if (hasAreaName) row.push(item.areaName || "");
    if (hasTiles) row.push(item.tiles || "");
    if (hasQty) row.push(item.qty || 0);
    if (hasUnit) row.push(item.unit || "");
    if (hasPrice) row.push((item.price || 0).toFixed(2));
    row.push(
      (item.total || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 }),
    );
    return row;
  });

  const columnStyles: any = {};
  columns.forEach((c, i) => {
    if (c.width !== "auto") {
      columnStyles[i] = { cellWidth: c.width, halign: c.align };
    } else {
      columnStyles[i] = { halign: c.align };
    }
  });

  const hasAdvance = bill.type === "BILL" && (bill.advance || 0) > 0;
  const hasDiscount = bill.type === "QUOTATION" && (bill.discount || 0) > 0;
  
  const footData = [];
  if (hasAdvance || hasDiscount) {
    const isBill = bill.type === "BILL";
    const deductionLabel = isBill ? "Advance" : "Discount";
    const deductionAmount = isBill ? (bill.advance || 0) : (bill.discount || 0);
    const finalLabel = isBill ? "Due" : "Grand Total";
    const netTotal = bill.grandTotal - deductionAmount;
    
    footData.push([
      {
        content: `In word: ${bill.totalInWords}`,
        rowSpan: 3,
        colSpan: columns.length - 2,
        styles: { fontStyle: "bold", font: settings.fontStyle, valign: "middle" },
      },
      {
        content: "Sub Total",
        styles: { fontStyle: "bold", halign: "right", font: settings.fontStyle },
      },
      {
        content: `Tk. ${bill.grandTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`,
        styles: { fontStyle: "bold", halign: "right", font: settings.fontStyle },
      }
    ]);
    footData.push([
      {
        content: deductionLabel,
        styles: { fontStyle: "bold", halign: "right", font: settings.fontStyle },
      },
      {
        content: `Tk. ${deductionAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`,
        styles: { fontStyle: "bold", halign: "right", font: settings.fontStyle },
      }
    ]);
    footData.push([
      {
        content: finalLabel,
        styles: { fontStyle: "bold", halign: "right", font: settings.fontStyle },
      },
      {
        content: `Tk. ${netTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`,
        styles: { fontStyle: "bold", halign: "right", font: settings.fontStyle, fillColor: [240, 240, 240] },
      }
    ]);
  } else {
    footData.push([
      {
        content: `In word: ${bill.totalInWords}`,
        colSpan: columns.length - 1,
        styles: { fontStyle: "bold", font: settings.fontStyle },
      },
      {
        content: `Tk. ${bill.grandTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`,
        styles: {
          fontStyle: "bold",
          halign: "right",
          font: settings.fontStyle,
        },
      },
    ]);
  }

  autoTable(doc, {
    startY: 61,
    margin: { top: 40, bottom: 20 },
    head: [columns.map((c) => c.header)],
    body: tableData,
    theme: "grid",
    headStyles: {
      fillColor: [200, 200, 200],
      textColor: [0, 0, 0],
      fontStyle: "bold",
      lineWidth: 0.1,
      halign: "center",
      font: settings.fontStyle,
    },
    styles: {
      fontSize: 8,
      cellPadding: 2,
      lineWidth: 0.1,
      font: settings.fontStyle,
      textColor: [40, 40, 40],
    },
    columnStyles: columnStyles,
    foot: footData,
    footStyles: {
      fillColor: [255, 255, 255],
      textColor: [0, 0, 0],
      lineWidth: 0.1,
    },
    didDrawPage: (data) => {
      // We already manually drew it on page 1 before autoTable
      if (data.pageNumber > 1) {
        addPageDecorations(data);
      } else {
        // Just add page number to first page after table drawn
        doc.setTextColor(150, 150, 150);
        doc.setFontSize(8);
        doc.text(`Page 1`, 190, 292, { align: "right" });
      }
    },
  });

  let finalY = (doc as any).lastAutoTable.finalY || 150;

  // Ensure enough space for signature and terms, otherwise add new page
  if (finalY > 230) {
    doc.addPage();
    addPageDecorations({
      pageNumber: (doc as any).internal.getNumberOfPages(),
    });
    finalY = 40;
  }

  // Signature
  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);
  // Center "Best regards" in the signature area (right side)
  const signatureCenterX = 170;
  doc.setFont(settings.fontStyle, "normal");
  doc.text("Best regards", signatureCenterX, finalY + 20, { align: "center" });

  if (bill.signature) {
    try {
      doc.addImage(
        bill.signature,
        "PNG",
        signatureCenterX - 15,
        finalY + 22,
        30,
        15,
      );
    } catch (e) {
      console.error("Error adding signature to PDF", e);
    }
  }

  doc.setFont(settings.fontStyle, "bold");
  const signatoryName = bill.preparedBy || localStorage.getItem("savedPreparedBy") || "";
  doc.text(signatoryName, signatureCenterX, finalY + 42, { align: "center" });
  doc.setFont(settings.fontStyle, "normal");

  // Terms & Conditions
  if (bill.termsAndConditions) {
    doc.setFontSize(9);
    doc.setFont(settings.fontStyle, "bold");
    doc.text("Terms & Conditions:", 20, finalY + 20);
    doc.setFont(settings.fontStyle, "normal");
    const splitTerms = doc.splitTextToSize(bill.termsAndConditions, 120);
    doc.text(splitTerms, 20, finalY + 25);
  }

  const companyPrefix = settings.companyName
    .replace(/\s+/g, "_")
    .toLowerCase();
  const sanitizedProject = bill.site.replace(/\s+/g, "_").toLowerCase();
  const dateStr = new Date().toISOString().split("T")[0];
  // Updated format: [date]_[type]_of_[project]_[billNumber].pdf
  const fileName = `${dateStr}_${bill.type.toLowerCase()}_of_${sanitizedProject}_${bill.billNumber}.pdf`;
  const isCapacitor = (window as any).Capacitor?.isNativePlatform();

  if (action === "bloburl") {
    return doc.output("bloburl").toString();
  }

  if (isCapacitor) {
    try {
      const pdfBase64 = doc.output("datauristring").split(",")[1];
      const result = await Filesystem.writeFile({
        path: fileName,
        data: pdfBase64,
        directory: Directory.Cache,
      });

      if (action === "share") {
        await Share.share({
          title: `${bill.type} - ${bill.recipientName}`,
          text: `Please find the ${bill.type.toLowerCase()} attached.`,
          url: result.uri,
          dialogTitle: `Share ${bill.type}`,
        });
      } else {
        // For 'view' and 'download' on Android, we use Share as a way to open/save the file
        await Share.share({
          title: fileName,
          url: result.uri,
        });
      }
    } catch (e) {
      console.error("Capacitor PDF Error:", e);
      if (action === "download") doc.save(fileName);
    }
  } else {
    if (action === "download") {
      doc.save(fileName);
    } else if (action === "view") {
      const blobUrl = doc.output("bloburl");
      window.open(blobUrl, "_blank");
    } else if (action === "share") {
      const pdfBlob = doc.output("blob");
      const file = new File([pdfBlob], fileName, { type: "application/pdf" });
      if (navigator.share) {
        await navigator.share({
          files: [file],
          title: `${bill.type} - ${bill.recipientName}`,
          text: `Please find the ${bill.type.toLowerCase()} attached.`,
        });
      } else {
        doc.save(fileName);
      }
    }
  }

  return doc;
};

function PDFSettingsView({
  settings,
  onSave,
  onBack,
}: {
  settings: PDFSettings;
  onSave: (s: PDFSettings) => void;
  onBack: () => void;
}) {
  const [form, setForm] = useState<PDFSettings>(settings);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setForm({ ...form, logo: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="space-y-6 pb-20">
      <div className="flex items-center gap-2">
        <button
          onClick={onBack}
          className="p-1 hover:bg-[#F5F5F5] rounded-full transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h2 className="text-xl font-bold border-b-2 border-[#0D47A1] inline-block pb-1">
          PDF Customization
        </h2>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-md border border-[#B0BEC5] space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Company Info */}
          <div className="space-y-4">
            <h3 className="font-bold text-[#0D47A1] border-b pb-2">
              Company Information
            </h3>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-[#78909C] uppercase">
                Company Name
              </label>
              <input
                type="text"
                value={form.companyName}
                onChange={(e) =>
                  setForm({ ...form, companyName: e.target.value })
                }
                className="w-full p-2 border border-[#B0BEC5] rounded bg-[#F5F9FD] text-sm"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-[#78909C] uppercase">
                Address
              </label>
              <textarea
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                className="w-full p-2 border border-[#B0BEC5] rounded bg-[#F5F9FD] text-sm h-20"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-[#78909C] uppercase">
                Email
              </label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full p-2 border border-[#B0BEC5] rounded bg-[#F5F9FD] text-sm"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-[#78909C] uppercase">
                Contact Number
              </label>
              <input
                type="text"
                value={form.contact}
                onChange={(e) => setForm({ ...form, contact: e.target.value })}
                className="w-full p-2 border border-[#B0BEC5] rounded bg-[#F5F9FD] text-sm"
              />
            </div>
          </div>

          {/* Visual Settings */}
          <div className="space-y-4">
            <h3 className="font-bold text-[#0D47A1] border-b pb-2">
              Visual Customization
            </h3>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-[#78909C] uppercase">
                Company Logo
              </label>
              <div className="flex items-center gap-4">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="text-xs cursor-pointer"
                />
                {form.logo && (
                  <div className="relative group">
                    <img
                      src={form.logo}
                      alt="Logo"
                      className="h-12 border border-[#B0BEC5] rounded"
                    />
                    <button
                      onClick={() => setForm({ ...form, logo: undefined })}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5 shadow-md"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2 mt-2">
                <input
                  type="checkbox"
                  id="hideNameText"
                  checked={form.hideNameText}
                  onChange={(e) =>
                    setForm({ ...form, hideNameText: e.target.checked })
                  }
                  className="w-4 h-4"
                />
                <label
                  htmlFor="hideNameText"
                  className="text-xs font-medium text-[#37474F]"
                >
                  Hide Company Name Text (Use if logo has name)
                </label>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-[#78909C] uppercase">
                  Header BG Color
                </label>
                <div className="flex gap-2 items-center">
                  <input
                    type="color"
                    value={form.headerBgColor}
                    onChange={(e) =>
                      setForm({ ...form, headerBgColor: e.target.value })
                    }
                    className="w-10 h-10 p-0 border-0 rounded cursor-pointer"
                  />
                  <span className="text-xs font-mono uppercase">
                    {form.headerBgColor}
                  </span>
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-[#78909C] uppercase">
                  Header Text Color
                </label>
                <div className="flex gap-2 items-center">
                  <input
                    type="color"
                    value={form.headerTextColor}
                    onChange={(e) =>
                      setForm({ ...form, headerTextColor: e.target.value })
                    }
                    className="w-10 h-10 p-0 border-0 rounded cursor-pointer"
                  />
                  <span className="text-xs font-mono uppercase">
                    {form.headerTextColor}
                  </span>
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-[#78909C] uppercase">
                  Footer BG Color
                </label>
                <div className="flex gap-2 items-center">
                  <input
                    type="color"
                    value={form.footerBgColor}
                    onChange={(e) =>
                      setForm({ ...form, footerBgColor: e.target.value })
                    }
                    className="w-10 h-10 p-0 border-0 rounded cursor-pointer"
                  />
                  <span className="text-xs font-mono uppercase">
                    {form.footerBgColor}
                  </span>
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-[#78909C] uppercase">
                  Footer Text Color
                </label>
                <div className="flex gap-2 items-center">
                  <input
                    type="color"
                    value={form.footerTextColor}
                    onChange={(e) =>
                      setForm({ ...form, footerTextColor: e.target.value })
                    }
                    className="w-10 h-10 p-0 border-0 rounded cursor-pointer"
                  />
                  <span className="text-xs font-mono uppercase">
                    {form.footerTextColor}
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-[#78909C] uppercase">
                Font Style
              </label>
              <select
                value={form.fontStyle}
                onChange={(e) =>
                  setForm({ ...form, fontStyle: e.target.value as any })
                }
                className="w-full p-2 border border-[#B0BEC5] rounded bg-[#F5F9FD] text-sm"
              >
                <option value="helvetica">Helvetica (Standard)</option>
                <option value="times">Times New Roman</option>
                <option value="courier">Courier</option>
              </select>
            </div>
          </div>
        </div>

        <div className="pt-6 border-t border-[#B0BEC5] flex justify-end">
          <button
            onClick={() => {
              onSave(form);
              alert("PDF Settings saved successfully!");
              onBack();
            }}
            className="px-6 py-2.5 bg-[#0D47A1] text-white rounded-lg font-bold hover:bg-[#1565C0] transition-all flex items-center gap-2 shadow-lg"
          >
            <CheckCircle2 className="w-5 h-5" />
            Save Customizations
          </button>
        </div>
      </div>

      {/* Preview Section */}
      <div className="bg-slate-100 p-4 rounded-xl border-2 border-dashed border-slate-300">
        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest text-center mb-4">
          Live Preview (Header & Footer)
        </p>

        <div className="bg-white shadow-lg max-w-md mx-auto overflow-hidden border border-slate-200">
          {/* Header Preview */}
          <div
            style={{
              backgroundColor: form.headerBgColor,
              color: form.headerTextColor,
            }}
            className={`p-4 text-center border-b ${form.hideNameText && form.logo ? "flex items-center justify-center" : ""}`}
          >
            {form.logo && (
              <img
                src={form.logo}
                alt="Logo"
                className={`h-12 mx-auto ${!form.hideNameText ? "mb-2" : ""}`}
              />
            )}
            {!form.hideNameText && (
              <h4
                className="font-bold text-lg uppercase"
                style={{ fontFamily: form.fontStyle }}
              >
                {form.companyName}
              </h4>
            )}
          </div>

          {/* Content Placeholder */}
          <div className="p-8 space-y-4">
            <div className="h-4 bg-slate-100 rounded w-3/4" />
            <div className="h-20 bg-slate-50 rounded w-full" />
            <div className="h-4 bg-slate-100 rounded w-1/2" />
          </div>

          {/* Footer Preview */}
          <div
            style={{
              backgroundColor: form.footerBgColor,
              color: form.footerTextColor,
            }}
            className="p-3 text-center text-[8px] space-y-1"
          >
            <p style={{ fontFamily: form.fontStyle }}>
              {form.address} | Email: {form.email}
            </p>
            <p style={{ fontFamily: form.fontStyle }}>
              Contact: {form.contact}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function BillView({
  type,
  nextNumber,
  onSave,
  onBack,
  onConvertToBill,
  initialBill,
  pdfSettings,
}: {
  key?: string;
  type: "BILL" | "QUOTATION";
  nextNumber: number;
  onSave: (bill: Bill) => void;
  onBack: () => void;
  onConvertToBill?: (bill: Bill) => void;
  initialBill?: Bill;
  pdfSettings: PDFSettings;
}) {
  const billNumber = initialBill
    ? initialBill.billNumber
    : `AE-${type === "BILL" ? "B" : "Q"}-${nextNumber.toString().padStart(4, "0")}`;
  const [recipientName, setRecipientName] = useState(() => {
    if (initialBill) return initialBill.recipientName;
    return localStorage.getItem(`draft_${type}_recipientName`) || "";
  });
  const [site, setSite] = useState(() => {
    if (initialBill) return initialBill.site || "";
    return localStorage.getItem(`draft_${type}_site`) || "";
  });
  const [subject, setSubject] = useState(() => {
    if (initialBill) return initialBill.subject || "";
    const saved = localStorage.getItem(`draft_${type}_subject`);
    if (saved !== null) return saved;
    return type === "BILL"
      ? "Bill for tiles installation work."
      : "Quotation for tiles installation work.";
  });
  const [date, setDate] = useState(() => {
    if (initialBill) return initialBill.date;
    return localStorage.getItem(`draft_${type}_date`) || new Date().toISOString().split("T")[0];
  });
  const [items, setItems] = useState<BillItem[]>(() => {
    if (initialBill) return initialBill.items;
    try {
      const saved = localStorage.getItem(`draft_${type}_items`);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error("Error loading draft items:", e);
    }
    return [
      {
        id: generateId(),
        areaName: "",
        tiles: "",
        qty: 0,
        unit: "sft",
        price: 0,
        total: 0,
      },
    ];
  });
  const [preparedBy, setPreparedBy] = useState(() => {
    if (initialBill) return initialBill.preparedBy || "";
    return localStorage.getItem(`draft_${type}_preparedBy`) ||
      localStorage.getItem("savedPreparedBy") ||
      "Md Shahiduzzaman Anik";
  });
  const [signature, setSignature] = useState<string | undefined>(() => {
    if (initialBill) return initialBill.signature;
    return localStorage.getItem(`draft_${type}_signature`) ||
      localStorage.getItem("savedSignature") ||
      undefined;
  });

  useEffect(() => {
    localStorage.setItem("savedPreparedBy", preparedBy);
  }, [preparedBy]);

  const [terms, setTerms] = useState(() => {
    if (initialBill) return initialBill.termsAndConditions || "";
    const saved = localStorage.getItem(`draft_${type}_terms`);
    if (saved !== null) return saved;
    return type === "QUOTATION"
      ? "1. Payment should be made within 7 days.\n2. 50% advance required."
      : "";
  });
  
  const [advance, setAdvance] = useState<number>(() => {
    if (initialBill) return initialBill.advance || 0;
    const saved = localStorage.getItem(`draft_${type}_advance`);
    return saved ? parseFloat(saved) : 0;
  });
  const [discount, setDiscount] = useState<number>(() => {
    if (initialBill) return initialBill.discount || 0;
    const saved = localStorage.getItem(`draft_${type}_discount`);
    return saved ? parseFloat(saved) : 0;
  });

  useEffect(() => {
    if (!initialBill) {
      localStorage.setItem(`draft_${type}_recipientName`, recipientName);
    }
  }, [recipientName, type, initialBill]);

  useEffect(() => {
    if (!initialBill) {
      localStorage.setItem(`draft_${type}_site`, site);
    }
  }, [site, type, initialBill]);

  useEffect(() => {
    if (!initialBill) {
      localStorage.setItem(`draft_${type}_subject`, subject);
    }
  }, [subject, type, initialBill]);

  useEffect(() => {
    if (!initialBill) {
      localStorage.setItem(`draft_${type}_date`, date);
    }
  }, [date, type, initialBill]);

  useEffect(() => {
    if (!initialBill) {
      localStorage.setItem(`draft_${type}_items`, JSON.stringify(items));
    }
  }, [items, type, initialBill]);

  useEffect(() => {
    if (!initialBill) {
      localStorage.setItem(`draft_${type}_preparedBy`, preparedBy);
    }
  }, [preparedBy, type, initialBill]);

  useEffect(() => {
    if (!initialBill) {
      if (signature) {
        localStorage.setItem(`draft_${type}_signature`, signature);
      } else {
        localStorage.removeItem(`draft_${type}_signature`);
      }
    }
  }, [signature, type, initialBill]);

  useEffect(() => {
    if (!initialBill) {
      localStorage.setItem(`draft_${type}_terms`, terms);
    }
  }, [terms, type, initialBill]);

  useEffect(() => {
    if (!initialBill) {
      localStorage.setItem(`draft_${type}_advance`, advance.toString());
    }
  }, [advance, type, initialBill]);

  useEffect(() => {
    if (!initialBill) {
      localStorage.setItem(`draft_${type}_discount`, discount.toString());
    }
  }, [discount, type, initialBill]);

  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [currentPdfPage, setCurrentPdfPage] = useState<number>(1);
  const [numPages, setNumPages] = useState<number>(1);
  const [containerWidth, setContainerWidth] = useState<number>(450);
  const containerRef = useRef<HTMLDivElement>(null);
  const pageRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    if (pageRefs.current[currentPdfPage - 1] && containerRef.current) {
      const pageEl = pageRefs.current[currentPdfPage - 1];
      if (pageEl) {
        containerRef.current.scrollTo({
          top: pageEl.offsetTop - containerRef.current.offsetTop - 16,
          behavior: "smooth",
        });
      }
    }
  }, [currentPdfPage, previewUrl]);

  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.clientWidth - 32);
      }
    };

    // Slight delay to ensure DOM is ready
    const timeoutId = setTimeout(handleResize, 100);

    window.addEventListener("resize", handleResize);
    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener("resize", handleResize);
    };
  }, [previewUrl]);

  useEffect(() => {
    return () => {
      // Cleanup object URL on unmount
      setPreviewUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return "";
      });
    };
  }, []);

  const grandTotal = items.reduce((sum, item) => sum + item.total, 0);
  const netTotal = type === "BILL" ? Math.max(0, grandTotal - advance) : Math.max(0, grandTotal - discount);

  useEffect(() => {
    let active = true;
    const updatePreview = async () => {
      const previewBill: Bill = {
        id: initialBill ? initialBill.id : generateId(),
        type,
        billNumber,
        date,
        recipientName: recipientName || "Preview Recipient",
        site: site || "Preview Site",
        subject: subject || "Preview Subject",
        items,
        totalInWords: numberToWords(netTotal),
        grandTotal,
        advance: type === "BILL" ? advance : undefined,
        discount: type === "QUOTATION" ? discount : undefined,
        preparedBy: preparedBy || "Preview Signatory",
        signature: signature || null,
        termsAndConditions: terms,
        timestamp: initialBill
          ? initialBill.timestamp
          : new Date().toLocaleString("en-GB"),
        revision: initialBill ? initialBill.revision : 0,
      };

      try {
        const urlParams = await generateBillPDF(
          previewBill,
          "bloburl",
          pdfSettings,
        );
        if (active && typeof urlParams === "string") {
          setPreviewUrl((prev) => {
            if (prev) URL.revokeObjectURL(prev);
            return urlParams;
          });
        }
      } catch (err) {
        console.error("Preview generation error", err);
      }
    };

    const t = setTimeout(updatePreview, 500);
    return () => {
      active = false;
      clearTimeout(t);
    };
  }, [
    type,
    billNumber,
    date,
    recipientName,
    site,
    subject,
    items,
    grandTotal,
    advance,
    discount,
    preparedBy,
    signature,
    terms,
    pdfSettings,
    initialBill,
  ]);

  const handleSignatureUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        setSignature(base64);
        localStorage.setItem("savedSignature", base64);
      };
      reader.readAsDataURL(file);
    }
  };

  const addItem = () => {
    setItems([
      ...items,
      {
        id: generateId(),
        areaName: "",
        tiles: "",
        qty: 0,
        unit: "sft",
        price: 0,
        total: 0,
      },
    ]);
  };

  const insertItem = (index: number) => {
    const newItem = {
      id: generateId(),
      areaName: "",
      tiles: "",
      qty: 0,
      unit: "sft",
      price: 0,
      total: 0,
    };
    const updated = [...items];
    updated.splice(index, 0, newItem);
    setItems(updated);
  };

  const moveItem = (index: number, direction: "up" | "down") => {
    if (direction === "up" && index === 0) return;
    if (direction === "down" && index === items.length - 1) return;
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    const updated = [...items];
    const temp = updated[index];
    updated[index] = updated[targetIndex];
    updated[targetIndex] = temp;
    setItems(updated);
  };

  const removeItem = (id: string) => {
    if (items.length > 1) {
      setItems(items.filter((item) => item.id !== id));
    }
  };

  const updateItem = (id: string, field: keyof BillItem, value: any) => {
    setItems(
      items.map((item) => {
        if (item.id === id) {
          const updatedItem = { ...item, [field]: value };
          if (field === "qty" || field === "price") {
            updatedItem.total =
              (updatedItem.qty || 0) * (updatedItem.price || 0);
          }
          return updatedItem;
        }
        return item;
      }),
    );
  };

  const handleSave = async () => {
    if (!recipientName.trim()) {
      alert("Please enter recipient name");
      return;
    }

    let revision = initialBill?.revision || 0;
    if (initialBill && initialBill.grandTotal !== grandTotal) {
      revision += 1;
    }

    const newBill: Bill = {
      id: initialBill ? initialBill.id : generateId(),
      type,
      billNumber,
      date,
      recipientName,
      site,
      subject,
      items,
      totalInWords: numberToWords(netTotal),
      grandTotal,
      advance: type === "BILL" ? (advance || 0) : 0,
      discount: type === "QUOTATION" ? (discount || 0) : 0,
      preparedBy,
      signature: signature || null,
      termsAndConditions: terms,
      timestamp: initialBill
        ? initialBill.timestamp
        : new Date().toLocaleString("en-GB"),
      revision,
    };

    try {
      await onSave(newBill);
      // Automatically download PDF on save
      await generateBillPDF(newBill, "download", pdfSettings);
      
      // Clear drafts for this type
      if (!initialBill) {
        localStorage.removeItem(`draft_${type}_recipientName`);
        localStorage.removeItem(`draft_${type}_site`);
        localStorage.removeItem(`draft_${type}_subject`);
        localStorage.removeItem(`draft_${type}_date`);
        localStorage.removeItem(`draft_${type}_items`);
        localStorage.removeItem(`draft_${type}_preparedBy`);
        localStorage.removeItem(`draft_${type}_signature`);
        localStorage.removeItem(`draft_${type}_terms`);
        localStorage.removeItem(`draft_${type}_advance`);
        localStorage.removeItem(`draft_${type}_discount`);
      }
    } catch (error) {
      console.error("Error in save sequence:", error);
      // Inner onSave handles alert already
    }
  };

  return (
    <div className="flex flex-col xl:flex-row gap-6 pb-20 items-start">
      <div
        className="w-full xl:w-1/2 space-y-6 flex-shrink-0"
        onFocus={(e) => {
          const itemEl = (e.target as HTMLElement).closest("[data-item-index]");
          if (itemEl) {
            const indexStr = itemEl.getAttribute("data-item-index");
            if (indexStr) {
              const index = parseInt(indexStr, 10);
              const pageNum =
                index < 20 ? 1 : Math.floor((index - 20) / 30) + 2;
              setCurrentPdfPage(pageNum);
            }
          } else {
            const isBottom = (e.target as HTMLElement).closest(
              ".bottom-section",
            );
            if (isBottom) {
              const totalItems = items.length;
              const lastPage =
                totalItems < 20 ? 1 : Math.floor((totalItems - 20) / 30) + 2;
              setCurrentPdfPage(lastPage);
            } else {
              setCurrentPdfPage(1);
            }
          }
        }}
      >
        <div className="flex items-center gap-2">
          <button
            onClick={onBack}
            className="p-1 hover:bg-[#F5F5F5] rounded-full transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h2 className="text-xl font-bold border-b-2 border-[#0D47A1] inline-block pb-1">
            {initialBill ? "Edit" : "Create"}{" "}
            {type === "BILL" ? "Bill" : "Quotation"}
          </h2>
        </div>

        <div className="bg-white p-4 rounded-xl shadow-md border border-[#B0BEC5] space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-[#78909C] uppercase">
                Bill Number
              </label>
              <div className="w-full p-2 border border-[#B0BEC5] rounded bg-gray-100 text-sm font-bold text-[#0D47A1]">
                {billNumber}
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-[#78909C] uppercase">
                Recipient Name
              </label>
              <input
                type="text"
                value={recipientName}
                onChange={(e) => setRecipientName(e.target.value)}
                className="w-full p-2 border border-[#B0BEC5] rounded bg-[#F5F9FD] text-sm"
                placeholder="Recipient Name"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-[#78909C] uppercase">
                Date
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full p-2 border border-[#B0BEC5] rounded bg-[#F5F9FD] text-sm"
              />
            </div>
            <div className="space-y-1 md:col-span-2">
              <label className="text-[10px] font-bold text-[#78909C] uppercase">
                Site Name
              </label>
              <input
                type="text"
                value={site}
                onChange={(e) => setSite(e.target.value)}
                className="w-full p-2 border border-[#B0BEC5] rounded bg-[#F5F9FD] text-sm"
                placeholder="Site Name"
              />
            </div>
            <div className="space-y-1 md:col-span-2">
              <label className="text-[10px] font-bold text-[#78909C] uppercase">
                Subject
              </label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full p-2 border border-[#B0BEC5] rounded bg-[#F5F9FD] text-sm"
              />
            </div>

            {type === "QUOTATION" && (
              <div className="bottom-section space-y-1 md:col-span-2">
                <label className="text-[10px] font-bold text-[#78909C] uppercase">
                  Terms & Conditions
                </label>
                <textarea
                  value={terms}
                  onChange={(e) => setTerms(e.target.value)}
                  className="w-full p-2 border border-[#B0BEC5] rounded bg-[#F5F9FD] text-sm h-20"
                  placeholder="Enter terms and conditions..."
                />
              </div>
            )}

            <div className="bottom-section space-y-1 md:col-span-2">
              <label className="text-[10px] font-bold text-[#78909C] uppercase">
                Signature Details
              </label>
              <div className="flex flex-col gap-2">
                <input
                  type="text"
                  value={preparedBy}
                  onChange={(e) => setPreparedBy(e.target.value)}
                  className="w-full p-2 border border-[#B0BEC5] rounded bg-[#F5F9FD] text-sm"
                  placeholder="Signatory Name (e.g., Md Shahiduzzaman Anik)"
                />
                <div className="flex items-center gap-4">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleSignatureUpload}
                    className="text-xs cursor-pointer"
                  />
                  {signature && (
                    <img
                      src={signature}
                      alt="Signature"
                      className="h-10 border border-[#B0BEC5] rounded"
                    />
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center mb-2">
              <label className="text-[10px] font-bold text-[#78909C] uppercase">
                Items
              </label>
            </div>

            <div className="space-y-3">
              {items.map((item, index) => (
                <React.Fragment key={item.id}>
                  {/* Inline insertion bar before each item */}
                  <div className="relative flex items-center justify-center py-1 group/insert">
                    <div className="absolute inset-0 flex items-center" aria-hidden="true">
                      <div className="w-full border-t border-dashed border-[#90CAF9]/40 group-hover/insert:border-[#0D47A1]/40"></div>
                    </div>
                    <button
                      type="button"
                      onClick={() => insertItem(index)}
                      className="relative z-10 px-2.5 py-0.5 bg-white hover:bg-[#E3F2FD] border border-[#90CAF9] text-[#0D47A1] rounded-full text-[10px] font-bold flex items-center gap-1 transition-all shadow-sm opacity-40 group-hover/insert:opacity-100 scale-95 group-hover/insert:scale-100 cursor-pointer"
                      title="Insert item here"
                    >
                      <Plus className="w-3 h-3 text-[#0D47A1]" /> Insert Item Here
                    </button>
                  </div>

                  <div
                    data-item-index={index}
                    className="p-3 border border-[#B0BEC5]/30 rounded-lg bg-[#F5F9FD] space-y-2 relative pr-10"
                  >
                    <div className="absolute right-2 top-2 flex flex-col gap-1.5 items-center z-10">
                      <button
                        type="button"
                        onClick={() => removeItem(item.id)}
                        className="text-red-500 hover:bg-red-50 p-1 rounded transition-colors cursor-pointer"
                        title="Remove Item"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      {index > 0 && (
                        <button
                          type="button"
                          onClick={() => moveItem(index, "up")}
                          className="text-[#0D47A1] hover:bg-blue-50 p-1 rounded transition-colors cursor-pointer"
                          title="Move Up"
                        >
                          <ChevronUp className="w-4 h-4" />
                        </button>
                      )}
                      {index < items.length - 1 && (
                        <button
                          type="button"
                          onClick={() => moveItem(index, "down")}
                          className="text-[#0D47A1] hover:bg-blue-50 p-1 rounded transition-colors cursor-pointer"
                          title="Move Down"
                        >
                          <ChevronDown className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="col-span-2">
                        <input
                          type="text"
                          placeholder="Area Name"
                          value={item.areaName}
                          onChange={(e) =>
                            updateItem(item.id, "areaName", e.target.value)
                          }
                          className="w-full p-1.5 border border-[#B0BEC5] rounded text-xs"
                        />
                      </div>
                      <div className="col-span-2">
                        <input
                          type="text"
                          placeholder="Work Description"
                          value={item.tiles}
                          onChange={(e) =>
                            updateItem(item.id, "tiles", e.target.value)
                          }
                          className="w-full p-1.5 border border-[#B0BEC5] rounded text-xs"
                        />
                      </div>
                      <div>
                        <input
                          type="number"
                          placeholder="Qty"
                          value={item.qty || ""}
                          onChange={(e) =>
                            updateItem(
                              item.id,
                              "qty",
                              parseFloat(e.target.value) || 0,
                            )
                          }
                          className="w-full p-1.5 border border-[#B0BEC5] rounded text-xs"
                        />
                      </div>
                      <div>
                        <input
                          type="text"
                          placeholder="Unit (sft/rft)"
                          value={item.unit}
                          onChange={(e) =>
                            updateItem(item.id, "unit", e.target.value)
                          }
                          className="w-full p-1.5 border border-[#B0BEC5] rounded text-xs"
                        />
                      </div>
                      <div>
                        <input
                          type="number"
                          placeholder="Price"
                          value={item.price || ""}
                          onChange={(e) =>
                            updateItem(
                              item.id,
                              "price",
                              parseFloat(e.target.value) || 0,
                            )
                          }
                          className="w-full p-1.5 border border-[#B0BEC5] rounded text-xs"
                        />
                      </div>
                      <div className="flex items-center justify-end font-bold text-xs">
                        Total: {item.total.toLocaleString()}
                      </div>
                    </div>
                  </div>
                </React.Fragment>
              ))}

              <button
                onClick={addItem}
                className="w-full py-2 hover:bg-[#E3F2FD] border-2 border-dashed border-[#90CAF9] rounded-lg text-sm font-bold text-[#0D47A1] flex items-center justify-center gap-2 transition-colors"
              >
                <Plus className="w-4 h-4" /> Add Item
              </button>
            </div>
          </div>

          <div className="pt-4 border-t border-[#B0BEC5] flex justify-between items-end gap-2 flex-wrap">
            <div className="flex flex-col gap-2">
              <div className="px-3 py-1.5 bg-slate-100 text-slate-800 rounded-lg font-bold text-xs sm:text-sm border border-slate-200">
                Sub Total: Tk. {grandTotal.toLocaleString()}
              </div>
              
              {type === "BILL" ? (
                <div className="flex items-center gap-2">
                  <label className="text-xs sm:text-sm font-bold text-slate-600 w-16">Advance:</label>
                  <input
                    type="number"
                    value={advance || ""}
                    onChange={(e) => setAdvance(parseFloat(e.target.value) || 0)}
                    className="w-24 p-1.5 border border-[#B0BEC5] rounded text-xs"
                    placeholder="Tk."
                  />
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <label className="text-xs sm:text-sm font-bold text-slate-600 w-16">Discount:</label>
                  <input
                    type="number"
                    value={discount || ""}
                    onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                    className="w-24 p-1.5 border border-[#B0BEC5] rounded text-xs"
                    placeholder="Tk."
                  />
                </div>
              )}

              <div className="px-3 py-1.5 bg-[#E8F5E9] text-[#2E7D32] rounded-lg font-bold text-xs sm:text-sm border border-green-200 mt-1">
                {type === "BILL" ? "Due" : "Total"}: Tk. {netTotal.toLocaleString()}
              </div>
            </div>
            
            <div className="flex gap-2 mb-1">
              {type === "QUOTATION" && onConvertToBill && (
                <button
                  onClick={() => {
                    onConvertToBill({
                      id: generateId(),
                      type: "BILL",
                      billNumber: "",
                      date: new Date().toISOString().split("T")[0],
                      recipientName,
                      site,
                      subject: subject.replace(/Quotation/i, "Bill"),
                      items,
                      totalInWords: numberToWords(grandTotal),
                      grandTotal,
                      advance: 0,
                      preparedBy,
                      signature,
                      termsAndConditions: terms,
                      timestamp: new Date().toLocaleString("en-GB"),
                    });
                  }}
                  className="px-4 py-2 bg-[#2E7D32] text-white rounded-lg font-bold hover:bg-[#1B5E20] transition-all text-xs sm:text-sm whitespace-nowrap shadow flex items-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Convert to Bill
                </button>
              )}
              <button
                onClick={handleSave}
                className="px-4 py-2 bg-[#0D47A1] text-white rounded-lg font-bold hover:bg-[#1565C0] transition-all text-xs sm:text-sm whitespace-nowrap shadow"
              >
                {initialBill ? "Update" : "Submit"}{" "}
                {type === "BILL" ? "Bill" : "Quotation"}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div
        ref={containerRef}
        className="w-full xl:w-1/2 h-[600px] xl:h-[calc(100vh-4rem)] xl:sticky xl:top-4 rounded-xl overflow-y-auto shadow-lg border border-[#B0BEC5] bg-gray-50 flex-shrink-0 flex flex-col items-center p-4"
      >
        {previewUrl ? (
          <Document
            file={previewUrl}
            onLoadSuccess={({ numPages }) => setNumPages(numPages)}
            loading={
              <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 font-bold gap-2">
                <div className="w-8 h-8 border-4 border-[#0D47A1] border-t-transparent rounded-full animate-spin"></div>
                Rendering PDF...
              </div>
            }
            className="flex flex-col items-center gap-4 w-full"
          >
            {Array.from(new Array(numPages), (el, index) => (
              <div
                key={`page_${index + 1}`}
                ref={(el) => (pageRefs.current[index] = el)}
                className="w-full flex justify-center shadow-md relative"
              >
                <Page
                  pageNumber={index + 1}
                  renderAnnotationLayer={false}
                  renderTextLayer={false}
                  width={containerWidth}
                />
              </div>
            ))}
          </Document>
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 font-bold gap-2">
            <div className="w-8 h-8 border-4 border-[#0D47A1] border-t-transparent rounded-full animate-spin"></div>
            Generating Preview...
          </div>
        )}
      </div>
    </div>
  );
}

function BillHistoryView({
  bills,
  onEdit,
  onConvertToBill,
  onBack,
  pdfSettings,
  isAdmin,
  isSuperAdmin,
}: {
  bills: Bill[];
  onEdit: (bill: Bill) => void;
  onConvertToBill?: (bill: Bill) => void;
  onBack: () => void;
  pdfSettings: PDFSettings;
  isAdmin: boolean;
  isSuperAdmin?: boolean;
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState<"BILL" | "QUOTATION">("BILL");

  const filteredBills = bills
    .filter(
      (b) =>
        b.type === activeTab &&
        (b.recipientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          b.site.toLowerCase().includes(searchTerm.toLowerCase()) ||
          b.billNumber.toLowerCase().includes(searchTerm.toLowerCase())),
    )
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const deleteBill = async (id: string) => {
    if (confirm("Are you sure you want to delete this?")) {
      const bill = bills.find((b) => b.id === id);
      const colName = bill?.type === "QUOTATION" ? "quotations" : "bills";
      try {
        await deleteDoc(doc(db, colName, id));
      } catch (error) {
        console.error("Error deleting bill:", error);
      }
    }
  };

  const handleShare = async (bill: Bill) => {
    await generateBillPDF(bill, "share", pdfSettings);
  };

  return (
    <div className="space-y-6 pb-20">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={onBack}
            className="p-1 hover:bg-[#F5F5F5] rounded-full transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h2 className="text-xl font-bold border-b-2 border-[#0D47A1] inline-block pb-1">
            History
          </h2>
        </div>
      </div>

      <div className="flex bg-white p-1 rounded-lg border border-[#B0BEC5] shadow-sm">
        <button
          onClick={() => setActiveTab("BILL")}
          className={`flex-1 py-2 text-xs font-bold rounded-md transition-all ${activeTab === "BILL" ? "bg-[#0D47A1] text-white shadow-md" : "text-[#78909C] hover:bg-gray-50"}`}
        >
          Bills
        </button>
        <button
          onClick={() => setActiveTab("QUOTATION")}
          className={`flex-1 py-2 text-xs font-bold rounded-md transition-all ${activeTab === "QUOTATION" ? "bg-[#0D47A1] text-white shadow-md" : "text-[#78909C] hover:bg-gray-50"}`}
        >
          Quotations
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#78909C]" />
        <input
          type="text"
          placeholder="Search by name or site..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-[#B0BEC5] rounded-lg bg-white text-sm focus:ring-2 focus:ring-[#0D47A1] outline-none"
        />
      </div>

      <div className="space-y-4">
        {filteredBills.map((bill) => (
          <div
            key={bill.id}
            onClick={async () =>
              await generateBillPDF(bill, "view", pdfSettings)
            }
            className="bg-white p-4 rounded-xl shadow-sm border border-[#B0BEC5] space-y-3 cursor-pointer hover:border-[#0D47A1] transition-colors"
          >
            <div className="flex justify-between items-start">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded ${bill.type === "BILL" ? "bg-blue-100 text-blue-700" : "bg-purple-100 text-purple-700"}`}
                  >
                    {bill.type}
                  </span>
                  <span className="text-xs text-[#78909C]">
                    {new Date(bill.date).toLocaleDateString("en-GB")}
                  </span>
                </div>
                <h3 className="font-bold text-[#1A237E] mt-1">
                  {bill.recipientName}
                </h3>
                <p className="text-xs text-[#78909C]">{bill.site}</p>
                {isSuperAdmin && (
                  <p className="text-[10px] text-[#78909C] mt-1 italic">
                    Added by: {bill.createdByEmail || "Unknown"}
                  </p>
                )}
              </div>
              <div className="text-right">
                <p className="font-bold text-[#2E7D32]">
                  {bill.type === "BILL" && (bill.advance || 0) > 0
                    ? Math.max(0, bill.grandTotal - (bill.advance || 0)).toLocaleString() 
                    : bill.type === "QUOTATION" && (bill.discount || 0) > 0
                    ? Math.max(0, bill.grandTotal - (bill.discount || 0)).toLocaleString() 
                    : bill.grandTotal.toLocaleString()}
                </p>
                {((bill.advance || 0) > 0 || (bill.discount || 0) > 0) && (
                  <p className="text-[10px] text-slate-500">
                    {bill.type === "BILL" ? "Due" : "Total"}
                  </p>
                )}
              </div>
            </div>

            <div
              className="flex justify-end gap-2 pt-2 border-t border-[#B0BEC5]/20"
              onClick={(e) => e.stopPropagation()}
            >
              {bill.type === "QUOTATION" && onConvertToBill && (
                <button
                  onClick={() => onConvertToBill(bill)}
                  className="p-2 text-[#2E7D32] hover:bg-green-50 rounded-lg transition-colors"
                  title="Convert to Bill"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              )}
              {isAdmin && (
                <>
                  <button
                    onClick={() => onEdit(bill)}
                    className="p-2 text-[#FF8F00] hover:bg-orange-50 rounded-lg transition-colors"
                    title="Edit"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => deleteBill(bill.id)}
                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </>
              )}
              <button
                onClick={async () =>
                  await generateBillPDF(bill, "download", pdfSettings)
                }
                className="p-2 text-[#0D47A1] hover:bg-blue-50 rounded-lg transition-colors"
                title="Download PDF"
              >
                <Download className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleShare(bill)}
                className="p-2 text-[#2E7D32] hover:bg-green-50 rounded-lg transition-colors"
                title="Share"
              >
                <Share2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
        {filteredBills.length === 0 && (
          <div className="text-center py-10 text-[#78909C]">
            No records found
          </div>
        )}
      </div>
    </div>
  );
}

function LoginView() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [authMessage, setAuthMessage] = useState<{
    type: "error" | "success";
    text: string;
  } | null>(null);

  const handleResetPassword = async () => {
    setAuthMessage(null);
    if (!email) {
      setAuthMessage({
        type: "error",
        text: "Please enter your email first to reset your password.",
      });
      return;
    }
    try {
      setLoading(true);
      await sendPasswordResetEmail(auth, email);
      setAuthMessage({
        type: "success",
        text: `Password reset email sent to ${email}. If you previously logged in with Google, you can set a password this way.`,
      });
    } catch (error: any) {
      console.error("Reset error:", error);
      setAuthMessage({ type: "error", text: "Reset Error: " + error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthMessage(null);
    if (!email || !password) {
      setAuthMessage({
        type: "error",
        text: "Please enter email and password.",
      });
      return;
    }
    if (!isLogin && password.length < 6) {
      setAuthMessage({
        type: "error",
        text: "Password should be at least 6 characters.",
      });
      return;
    }
    setLoading(true);
    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        const userCredential = await createUserWithEmailAndPassword(
          auth,
          email,
          password,
        );
        const firebaseUser = userCredential.user;
        const isSuperAdminEmail = email === "bijoymahmudmunna@gmail.com";

        await setDoc(doc(db, "users", firebaseUser.uid), {
          uid: firebaseUser.uid,
          email: firebaseUser.email || "",
          displayName:
            firebaseUser.displayName ||
            firebaseUser.email?.split("@")[0] ||
            "User",
          photoURL: firebaseUser.photoURL || "",
          role: isSuperAdminEmail ? "super_admin" : "member",
          isApproved: isSuperAdminEmail, // Default Super Admin is auto-approved
          createdAt: new Date().toISOString(),
          permissions: {
            dashboard: isSuperAdminEmail ? "edit" : "none",
            addData: isSuperAdminEmail ? "edit" : "none",
            payments: isSuperAdminEmail ? "edit" : "none",
            projects: isSuperAdminEmail ? "edit" : "none",
            revenue: isSuperAdminEmail ? "edit" : "none",
            tomorrowWork: isSuperAdminEmail ? "edit" : "none",
            billing: isSuperAdminEmail ? "edit" : "none",
            newBill: isSuperAdminEmail ? "edit" : "none",
            newQuotation: isSuperAdminEmail ? "edit" : "none",
            historyLogs: isSuperAdminEmail ? "edit" : "none",
            pdfSettings: isSuperAdminEmail ? "edit" : "none",
            exportBackup: isSuperAdminEmail ? "edit" : "none",
            backupProtection: isSuperAdminEmail ? "edit" : "none",
            projectList: isSuperAdminEmail ? "edit" : "none",
          },
        });

        if (isSuperAdminEmail) {
          setAuthMessage({
            type: "success",
            text: "Super Admin account created successfully!",
          });
        } else {
          setAuthMessage({
            type: "success",
            text: "Account created! Please wait for super admin approval.",
          });
        }
      }
    } catch (error: any) {
      console.error("Auth error:", error);
      if (error.code === "auth/invalid-credential") {
        setAuthMessage({
          type: "error",
          text: "Incorrect email or password. If you haven't created an account yet, please click 'Sign up' below. If you previously logged in with Google, click 'Forgot password?' to set a password.",
        });
      } else if (error.code === "auth/weak-password") {
        setAuthMessage({
          type: "error",
          text: "Password should be at least 6 characters.",
        });
      } else if (error.code === "auth/email-already-in-use") {
        setAuthMessage({
          type: "error",
          text: "An account with this email already exists. Please switch to 'Sign in'.",
        });
      } else {
        setAuthMessage({ type: "error", text: "Auth Error: " + error.message });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Abstract Background Shapes */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-[#295818]/10 rounded-full blur-3xl"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-[#295818]/5 rounded-full blur-3xl"></div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-[#295818] rounded-3xl shadow-2xl p-8 text-center relative z-10"
      >
        <div className="w-20 h-20 bg-white rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-md border border-white/20">
          <span className="text-4xl font-black text-[#DC2626] tracking-tighter">
            AE
          </span>
        </div>
        <h1 className="text-2xl font-black text-white mb-2 tracking-tight">
          ALTASMIM ENGINEERING
        </h1>
        <p className="text-white/70 font-medium mb-8">
          Management System {isLogin ? "Login" : "Signup"}
        </p>

        {authMessage && (
          <div
            className={`mb-6 p-4 rounded-xl text-sm font-medium text-left ${authMessage.type === "error" ? "bg-red-500/20 text-red-100 border border-red-500/30" : "bg-emerald-500/20 text-emerald-100 border border-emerald-500/30"}`}
          >
            {authMessage.text}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-left">
          <div>
            <label className="block text-sm font-medium text-white/90 mb-1">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-3 bg-white/10 border border-white/20 rounded-xl focus:ring-2 focus:ring-white focus:border-transparent outline-none text-white placeholder:text-white/40"
              placeholder="Enter your email"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-white/90 mb-1">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-3 bg-white/10 border border-white/20 rounded-xl focus:ring-2 focus:ring-white focus:border-transparent outline-none text-white placeholder:text-white/40"
              placeholder="Enter password"
              required
              minLength={isLogin ? undefined : 6}
            />
            {isLogin && (
              <div className="flex justify-end mt-2">
                <button
                  type="button"
                  onClick={handleResetPassword}
                  className="text-xs text-white/70 font-semibold hover:text-white hover:underline cursor-pointer"
                >
                  Forgot password?
                </button>
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 py-4 mt-6 rounded-2xl bg-white text-[#295818] font-bold text-lg hover:bg-slate-100 transition-all active:scale-[0.98] shadow-lg disabled:opacity-70 cursor-pointer disabled:cursor-not-allowed"
          >
            {loading ? "Processing..." : isLogin ? "Sign In" : "Sign Up"}
          </button>
        </form>

        <div className="mt-6 pt-6 border-t border-white/10">
          <p className="text-sm text-white/70">
            {isLogin ? "Don't have an account?" : "Already have an account?"}
            <button
              type="button"
              onClick={() => setIsLogin(!isLogin)}
              className="ml-2 font-semibold text-white hover:underline cursor-pointer"
            >
              {isLogin ? "Sign up" : "Sign in"}
            </button>
          </p>
        </div>
      </motion.div>

      <p className="mt-8 text-slate-400 text-xs font-medium">
        © 2026 Altasmim Engineering • v1.1.0
      </p>
    </div>
  );
}

function LocationTracker({ user }: { user: any }) {
  useEffect(() => {
    if (!user) return;
    
    let watchId: number;
    let intervalId: NodeJS.Timeout;

    const updateLocation = (position: GeolocationPosition) => {
      const { latitude, longitude, accuracy } = position.coords;
      try {
        setDoc(doc(db, "user_locations", user.uid), {
          lat: latitude,
          lng: longitude,
          accuracy,
          timestamp: Date.now(),
        }, { merge: true });
      } catch (e) {
        console.error("Error saving location:", e);
      }
    };

    const startTracking = () => {
      if ("geolocation" in navigator) {
        navigator.geolocation.getCurrentPosition(
            updateLocation,
            (err) => console.log("Init Geolocation error:", err),
            { enableHighAccuracy: true }
        );

        watchId = navigator.geolocation.watchPosition(
          updateLocation,
          (err) => console.log("Geolocation watch error:", err),
          { enableHighAccuracy: true, maximumAge: 10000, timeout: 20000 }
        );
        
        intervalId = setInterval(() => {
          navigator.geolocation.getCurrentPosition(
            updateLocation,
            (err) => console.log("Geolocation ping error:", err),
            { enableHighAccuracy: true }
          );
        }, 5 * 60 * 1000);
      }
    };

    startTracking();

    return () => {
      if (watchId !== undefined) navigator.geolocation.clearWatch(watchId);
      if (intervalId !== undefined) clearInterval(intervalId);
    };
  }, [user]);

  return null;
}

function LiveLocationsView({ onBack }: { onBack: () => void }) {
  const [locations, setLocations] = useState<any[]>([]);
  const [users, setUsers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch users for mapping UID to email/name
    const fetchUsers = async () => {
      try {
        const usersSnap = await getDocs(collection(db, "users"));
        const userMap: Record<string, string> = {};
        usersSnap.forEach(doc => {
          const data = doc.data();
          userMap[doc.id] = data.displayName || data.email;
        });
        setUsers(userMap);
      } catch (err) {
        console.error("Failed to load users for locations", err);
      }
    };
    fetchUsers();

    const unsub = onSnapshot(collection(db, "user_locations"), (snap) => {
      const locs: any[] = [];
      snap.forEach(doc => {
        locs.push({ uid: doc.id, ...doc.data() });
      });
      setLocations(locs);
      setLoading(false);
    }, (error) => {
      console.error("Live locations error:", error);
      setLoading(false);
    });

    return () => unsub();
  }, []);

  return (
    <div className="pb-24">
      <div className="bg-[#0D47A1] text-white p-4 sticky top-0 z-30 flex items-center shadow-md">
        <button onClick={onBack} className="mr-3 hover:bg-white/20 p-1.5 rounded-full transition-colors cursor-pointer">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h2 className="text-lg font-bold flex items-center gap-2">
          <MapPin className="w-5 h-5" />
          Live User Locations
        </h2>
      </div>

      <div className="p-4 space-y-4">
        {loading ? (
          <div className="text-center p-8 text-gray-500">Loading live locations...</div>
        ) : locations.length === 0 ? (
          <div className="bg-white p-6 rounded-2xl shadow-sm text-center border border-gray-200">
            <MapPin className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 mb-2 font-bold">No tracking data found</p>
            <p className="text-gray-400 text-sm">
              Users need to log in to the app, stay online, and grant <b>Location Permission</b> on their device to appear here.
            </p>
          </div>
        ) : (
          locations.map(loc => (
            <div key={loc.uid} className="bg-white p-4 rounded-xl shadow border border-gray-200 flex items-center justify-between">
              <div>
                <p className="font-bold text-[#0D47A1]">{users[loc.uid] || loc.uid}</p>
                <p className="text-xs text-gray-500 mt-1">
                  Last updated: {new Date(loc.timestamp).toLocaleString()}
                </p>
                {loc.accuracy && (
                  <p className="text-[10px] text-gray-400">Accuracy: {Math.round(loc.accuracy)}m</p>
                )}
              </div>
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${loc.lat},${loc.lng}`}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-green-600 text-white p-2 rounded-lg text-xs font-bold hover:bg-green-700 transition"
              >
                View on Map
              </a>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function UserManagementView({ onBack }: { onBack: () => void }) {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingPermissionsUid, setEditingPermissionsUid] = useState<
    string | null
  >(null);
  const [userToDelete, setUserToDelete] = useState<string | null>(null);

  useEffect(() => {
    const q = query(collection(db, "users"));
    const unsubscribe = onSnapshot(q, (snap) => {
      const usersList = snap.docs.map((doc) => doc.data() as UserProfile);
      setUsers(usersList);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const updateRole = async (uid: string, newRole: UserRole) => {
    try {
      await updateDoc(doc(db, "users", uid), { role: newRole });
    } catch (error) {
      console.error("Failed to update role:", error);
      alert("Failed to update role. You might not have permission.");
    }
  };

  const toggleApproval = async (uid: string, currentStatus: boolean) => {
    try {
      await updateDoc(doc(db, "users", uid), { isApproved: !currentStatus });
    } catch (error) {
      console.error("Failed to update approval:", error);
      alert("Failed to update approval. You might not have permission.");
    }
  };

  const updatePermission = async (
    uid: string,
    currentPermissions: any,
    module: string,
    newLevel: "none" | "view" | "edit",
  ) => {
    try {
      const updatedPermissions = { ...currentPermissions, [module]: newLevel };
      await updateDoc(doc(db, "users", uid), {
        permissions: updatedPermissions,
      });
    } catch (error) {
      console.error("Failed to update permission:", error);
      alert("Failed to update permission. You might not have permission.");
    }
  };

  const confirmDeleteUser = async () => {
    if (userToDelete) {
      try {
        await deleteDoc(doc(db, "users", userToDelete));
        setUserToDelete(null);
      } catch (error) {
        console.error("Failed to delete user:", error);
        alert("Failed to delete user. You might not have permission.");
      }
    }
  };

  const modules = [
    { key: "dashboard", label: "Dashboard" },
    { key: "addData", label: "Add Data" },
    { key: "payments", label: "Payments" },
    { key: "projects", label: "Projects" },
    { key: "revenue", label: "Revenue" },
    { key: "tomorrowWork", label: "WORK SCHEDULE" },
    { key: "billing", label: "Billing" },
    { key: "newBill", label: "New Bill" },
    { key: "newQuotation", label: "New Quotation" },
    { key: "historyLogs", label: "History & Logs" },
    { key: "pdfSettings", label: "PDF Settings" },
    { key: "exportBackup", label: "Export & Backup" },
    { key: "backupProtection", label: "Backup & Protection" },
    { key: "projectList", label: "Project List" },
  ];

  return (
    <div className="space-y-6 pb-20">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={onBack}
            className="p-1 hover:bg-[#F5F5F5] rounded-full transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h2 className="text-xl font-bold border-b-2 border-[#0D47A1] inline-block pb-1">
            User Management
          </h2>
        </div>
      </div>

      <div className="grid gap-4">
        {loading ? (
          <div className="text-center py-10 text-slate-400">
            Loading users...
          </div>
        ) : (
          users.map((user) => (
            <div
              key={user.uid}
              className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-col gap-4"
            >
              <div className="flex items-center justify-between gap-4 flex-wrap sm:flex-nowrap">
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center font-bold overflow-hidden ${user.isApproved ? "bg-blue-50 text-blue-600" : "bg-slate-100 text-slate-400"}`}
                  >
                    {user.photoURL ? (
                      <img
                        src={user.photoURL}
                        alt=""
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      user.displayName?.charAt(0) || "U"
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-slate-800 truncate">
                      {user.displayName}
                    </p>
                    <p className="text-xs text-slate-500 truncate">
                      {user.email}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 ml-auto sm:ml-0">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${user.isApproved ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"}`}
                    >
                      {user.isApproved ? "APPROVED" : "PENDING"}
                    </span>
                    <button
                      onClick={() => toggleApproval(user.uid, user.isApproved)}
                      disabled={user.email === "bijoymahmudmunna@gmail.com"}
                      className={`p-1.5 rounded-lg transition-colors cursor-pointer ${user.isApproved ? "text-rose-500 hover:bg-rose-50" : "text-emerald-500 hover:bg-emerald-50"} disabled:opacity-30 disabled:cursor-not-allowed`}
                      title={user.isApproved ? "Revoke Access" : "Approve User"}
                    >
                      {user.isApproved ? (
                        <ShieldX className="w-5 h-5" />
                      ) : (
                        <ShieldCheck className="w-5 h-5" />
                      )}
                    </button>
                  </div>

                  <div className="h-8 w-px bg-slate-100 hidden sm:block"></div>

                  <div className="flex items-center gap-2">
                    <select
                      value={user.role}
                      onChange={(e) =>
                        updateRole(user.uid, e.target.value as UserRole)
                      }
                      className="text-xs font-bold py-1.5 px-3 rounded-lg border border-slate-200 bg-slate-50 outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer disabled:cursor-not-allowed"
                      disabled={user.email === "bijoymahmudmunna@gmail.com"}
                    >
                      <option value="member">Member</option>
                      <option value="admin">Admin</option>
                      <option value="super_admin">Super Admin</option>
                    </select>

                    <button
                      onClick={() =>
                        setEditingPermissionsUid((prev) =>
                          prev === user.uid ? null : user.uid,
                        )
                      }
                      className="text-xs font-bold py-1.5 px-3 rounded-lg border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors cursor-pointer"
                      disabled={user.email === "bijoymahmudmunna@gmail.com"}
                    >
                      {editingPermissionsUid === user.uid
                        ? "Hide Perms"
                        : "Edit Perms"}
                    </button>

                    <button
                      onClick={() => setUserToDelete(user.uid)}
                      disabled={user.email === "bijoymahmudmunna@gmail.com"}
                      className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
                      title="Delete User"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>

              {editingPermissionsUid === user.uid && (
                <div className="mt-2 p-4 bg-slate-50 rounded-xl border border-slate-100 text-sm">
                  <h4 className="font-bold text-slate-700 mb-3 text-xs uppercase tracking-wider">
                    Module Permissions for{" "}
                    <span className="text-blue-600">
                      {user.displayName || "User"}
                    </span>
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {modules.map(({ key, label }) => (
                      <div
                        key={key}
                        className="flex flex-col bg-white p-2 rounded-lg border border-slate-100 shadow-sm"
                      >
                        <span className="text-xs font-semibold text-slate-500 mb-1">
                          {label}
                        </span>
                        <select
                          value={
                            (user.permissions &&
                              (user.permissions as any)[key]) ||
                            "none"
                          }
                          onChange={(e) =>
                            updatePermission(
                              user.uid,
                              user.permissions || {},
                              key,
                              e.target.value as "none" | "view" | "edit",
                            )
                          }
                          className="text-xs font-bold py-1.5 px-2 rounded-lg bg-slate-50 border border-slate-200 cursor-pointer disabled:cursor-not-allowed"
                          disabled={user.email === "bijoymahmudmunna@gmail.com"}
                        >
                          <option value="none">Hide</option>
                          <option value="view">Read Only</option>
                          <option value="edit">Edit / Add</option>
                        </select>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {userToDelete && (
        <div className="fixed inset-0 z-[200] bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl">
            <h3 className="text-xl font-bold text-slate-800 mb-2">
              Delete User
            </h3>
            <p className="text-slate-600 mb-6 text-sm">
              Are you sure you want to delete this user? This action cannot be
              undone and will remove their access completely.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setUserToDelete(null)}
                className="px-4 py-2 font-bold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteUser}
                className="px-4 py-2 font-bold text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors shadow-sm cursor-pointer"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function MeetingsView({
  meetings,
  isAdmin,
  isSuperAdmin,
  onBack,
}: {
  meetings: Meeting[];
  isAdmin: boolean;
  isSuperAdmin?: boolean;
  onBack: () => void;
}) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [clientName, setClientName] = useState("");
  const [meetingDate, setMeetingDate] = useState("");
  const [meetingTime, setMeetingTime] = useState("");
  const [agenda, setAgenda] = useState("");
  const [reminderEnabled, setReminderEnabled] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);

  const resetForm = () => {
    setClientName("");
    setMeetingDate("");
    setMeetingTime("");
    setAgenda("");
    setReminderEnabled(true);
    setShowAddForm(false);
    setEditingId(null);
  };

  const handleEdit = (meeting: Meeting) => {
    setEditingId(meeting.id);
    setClientName(meeting.clientName);
    setMeetingDate(meeting.meetingDate);
    setMeetingTime(meeting.meetingTime);
    setAgenda(meeting.agenda);
    setReminderEnabled(meeting.reminderEnabled ?? true);
    setShowAddForm(true);
  };

  const requestPermissions = async () => {
    try {
      const result = await LocalNotifications.requestPermissions();
      return result.display === "granted";
    } catch (error) {
      console.log(
        "Push notifications not available in web context or error:",
        error,
      );
      return false; // Typically not available in web without service workers, or may throw.
    }
  };

  const scheduleLocalNotification = async (meeting: Meeting) => {
    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    try {
      const scheduleDate = new Date(
        `${meeting.meetingDate}T${meeting.meetingTime}`,
      );
      if (scheduleDate.getTime() <= Date.now()) return; // Don't schedule past dates

      await LocalNotifications.schedule({
        notifications: [
          {
            title: "Meeting Reminder",
            body: `Meeting with ${meeting.clientName}. Agenda: ${meeting.agenda}`,
            id: meeting.notificationId || Math.floor(Math.random() * 100000000),
            schedule: { at: scheduleDate },
            sound: undefined,
            attachments: undefined,
            actionTypeId: "",
            extra: null,
          },
        ],
      });
    } catch (error) {
      console.error("Error scheduling notification:", error);
    }
  };

  const cancelLocalNotification = async (notificationId: number) => {
    try {
      await LocalNotifications.cancel({
        notifications: [{ id: notificationId }],
      });
    } catch (error) {
      console.log("Error canceling notification:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientName || !meetingDate || !meetingTime || !agenda) {
      alert("Please fill out all fields.");
      return;
    }

    try {
      const notificationId = Math.floor(Math.random() * 100000000);
      const newMeeting: Omit<Meeting, "id"> = {
        clientName,
        meetingDate,
        meetingTime,
        agenda,
        reminderEnabled,
        createdAt: new Date().toISOString(),
        notificationId: reminderEnabled ? notificationId : null,
        createdByEmail: auth.currentUser?.email || null,
      };

      if (editingId) {
        const meetingToUpdate = meetings.find((m) => m.id === editingId);
        if (meetingToUpdate && meetingToUpdate.notificationId) {
          await cancelLocalNotification(meetingToUpdate.notificationId);
        }
        await updateDoc(doc(db, "meetings", editingId), newMeeting);
        if (reminderEnabled) {
          await scheduleLocalNotification({
            ...newMeeting,
            id: editingId,
          } as Meeting);
        }
        alert("Meeting updated successfully.");
      } else {
        const docRef = await addDoc(collection(db, "meetings"), newMeeting);
        if (reminderEnabled) {
          await scheduleLocalNotification({
            ...newMeeting,
            id: docRef.id,
          } as Meeting);
        }
        alert("Meeting scheduled successfully.");
      }

      resetForm();
    } catch (error) {
      console.error("Error adding meeting:", error);
      alert("Failed to add meeting.");
    }
  };

  const handleDelete = async (meeting: Meeting) => {
    if (!window.confirm("Are you sure you want to delete this meeting?"))
      return;

    try {
      if (meeting.notificationId) {
        await cancelLocalNotification(meeting.notificationId);
      }
      await deleteDoc(doc(db, "meetings", meeting.id));
    } catch (error) {
      console.error("Error deleting meeting:", error);
    }
  };

  const sortedMeetings = [...meetings].sort((a, b) => {
    const dateA = new Date(`${a.meetingDate}T${a.meetingTime}`).getTime();
    const dateB = new Date(`${b.meetingDate}T${b.meetingTime}`).getTime();
    return dateB - dateA;
  });

  return (
    <div className="space-y-4 pb-20">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 mb-2">
          <button onClick={onBack} className="p-1">
            <ArrowLeft className="w-5 h-5 cursor-pointer" />
          </button>
          <h2 className="text-lg font-bold border-b-2 border-[#0D47A1] inline-block pb-1 text-[#0D47A1]">
            Client Meetings
          </h2>
        </div>

        {isAdmin && !showAddForm && (
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center gap-1 bg-[#0D47A1] text-white px-3 py-1.5 rounded-lg text-sm font-bold hover:bg-[#1565C0] transition-colors cursor-pointer shadow-md"
          >
            <Plus className="w-4 h-4" />
            New Meeting
          </button>
        )}
      </div>

      <AnimatePresence>
        {showAddForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden mb-4"
          >
            <form
              onSubmit={handleSubmit}
              className="bg-white p-4 sm:p-5 rounded-2xl shadow-sm border border-slate-200"
            >
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-bold text-base text-slate-800">
                  Schedule New Meeting
                </h3>
                <button
                  type="button"
                  onClick={resetForm}
                  className="p-1 hover:bg-slate-100 rounded-lg cursor-pointer"
                >
                  <X className="w-5 h-5 text-slate-500" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Client Name
                  </label>
                  <input
                    type="text"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl focus:border-[#0D47A1] focus:ring-1 focus:ring-[#0D47A1]"
                    placeholder="Enter client name"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                      Date
                    </label>
                    <input
                      type="date"
                      value={meetingDate}
                      onChange={(e) => setMeetingDate(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl focus:border-[#0D47A1] focus:ring-1 focus:ring-[#0D47A1]"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                      Time
                    </label>
                    <input
                      type="time"
                      value={meetingTime}
                      onChange={(e) => setMeetingTime(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl focus:border-[#0D47A1] focus:ring-1 focus:ring-[#0D47A1]"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Agenda / Notes
                  </label>
                  <textarea
                    value={agenda}
                    onChange={(e) => setAgenda(e.target.value)}
                    rows={3}
                    className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl focus:border-[#0D47A1] focus:ring-1 focus:ring-[#0D47A1]"
                    placeholder="Meeting agenda..."
                    required
                  />
                </div>

                <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <div
                    className={`p-2 rounded-lg ${reminderEnabled ? "bg-fuchsia-100 text-fuchsia-600" : "bg-slate-200 text-slate-400"}`}
                  >
                    {reminderEnabled ? (
                      <BellRing className="w-5 h-5" />
                    ) : (
                      <Bell className="w-5 h-5" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-sm text-slate-800">
                      Device Reminder
                    </p>
                    <p className="text-xs text-slate-500">
                      Notify me before the meeting starts
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={reminderEnabled}
                      onChange={(e) => setReminderEnabled(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-fuchsia-600"></div>
                  </label>
                </div>

                <button
                  type="submit"
                  className="w-full py-3 bg-[#0D47A1] text-white font-bold rounded-xl shadow-md hover:bg-[#1565C0] transition-colors cursor-pointer mt-4"
                >
                  Save Meeting
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {sortedMeetings.length === 0 ? (
          <div className="col-span-full bg-white rounded-2xl p-6 border border-slate-200 text-center shadow-sm">
            <CalendarClock className="w-10 h-10 text-slate-200 mx-auto mb-2" />
            <h3 className="text-base font-bold text-slate-700 mb-1">
              No Upcoming Meetings
            </h3>
            <p className="text-slate-500 text-xs">
              You haven't scheduled any client meetings yet.
            </p>
          </div>
        ) : (
          sortedMeetings.map((meeting) => {
            const meetingDateTime = new Date(
              `${meeting.meetingDate}T${meeting.meetingTime}`,
            );
            const isPast = meetingDateTime.getTime() < Date.now();

            return (
              <div
                key={meeting.id}
                className={`bg-white rounded-xl p-3 border shadow-sm transition-all flex flex-col sm:flex-row gap-3 ${isPast ? "border-slate-200 opacity-60" : "border-fuchsia-100 hover:shadow-md"}`}
              >
                <div className="flex-1 flex gap-3 min-w-0">
                  <div
                    className={`w-12 h-12 rounded-lg flex flex-col items-center justify-center shrink-0 ${isPast ? "bg-slate-100 text-slate-500" : "bg-fuchsia-50 text-fuchsia-700"}`}
                  >
                    <span className="text-[10px] font-bold uppercase tracking-wider">
                      {meetingDateTime.toLocaleString("default", {
                        month: "short",
                      })}
                    </span>
                    <span className="text-lg font-black leading-tight">
                      {meetingDateTime.getDate()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3
                      className={`font-bold text-base truncate ${isPast ? "text-slate-600" : "text-slate-800"}`}
                    >
                      {meeting.clientName}
                    </h3>
                    <div className="flex flex-wrap items-center gap-2 mt-0.5 mb-1.5">
                      <span className="flex items-center gap-1 auto text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                        <Clock className="w-3 h-3" />
                        {meetingDateTime.toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                      {meeting.reminderEnabled && !isPast && (
                        <span className="flex items-center gap-1 text-[10px] font-semibold text-fuchsia-600 bg-fuchsia-50 px-2 py-0.5 rounded">
                          <BellRing className="w-3 h-3" />
                          Reminder Set
                        </span>
                      )}
                      {isPast && (
                        <span className="flex items-center gap-1 text-[10px] font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded">
                          Completed
                        </span>
                      )}
                    </div>
                    <p className="text-xs border-l-2 border-slate-200 pl-2 py-0.5 text-slate-600 bg-slate-50 rounded-r line-clamp-2">
                      {meeting.agenda}
                    </p>
                  </div>
                </div>

                {isAdmin && (
                  <div className="flex items-start sm:items-center justify-end sm:border-l border-slate-100 sm:pl-3 gap-1 shrink-0">
                    <button
                      onClick={() => handleEdit(meeting)}
                      className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                      title="Edit Meeting"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(meeting)}
                      className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                      title="Delete Meeting"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

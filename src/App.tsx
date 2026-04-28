import React, { useState, useEffect, useMemo, useRef } from 'react';
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
  Shield
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
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
  CartesianGrid 
} from 'recharts';
import { EmployeePayment, ProjectExpense, View, TomorrowWorkRow, Bill, BillItem, PDFSettings, UserRole, UserProfile, CollectedBill } from './types';
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
  setDoc, 
  collection, 
  query, 
  where, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc,
  Timestamp,
  FirebaseUser
} from './firebase';

// Helper to format currency
const formatCurrency = (amount: number) => {
  return `Tk. ${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const DEFAULT_PDF_SETTINGS: PDFSettings = {
  companyName: 'ALTASMIM ENGINEERING',
  headerBgColor: '#FFFFFF',
  headerTextColor: '#DC0000',
  footerBgColor: '#FFFFFF',
  footerTextColor: '#000000',
  address: 'House 66, dag 1041, Khilbarirtek, Batagoli, Shahajadpur, Dhaka.',
  email: 'altasmimengineering@gmail.com',
  contact: '+8801703862448',
  fontStyle: 'helvetica',
  hideNameText: false
};

// --- Auth Context ---
interface AuthContextType {
  user: FirebaseUser | null;
  profile: UserProfile | null;
  loading: boolean;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  isMember: boolean;
  logout: () => Promise<void>;
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
        // Get or create profile
        const userDocRef = doc(db, 'users', firebaseUser.uid);
        const snap = await getDoc(userDocRef);
        
        let currentProfile: UserProfile;

        if (snap.exists()) {
          currentProfile = snap.data() as UserProfile;
          
          // Migration for existing users to add permissions
          if (!currentProfile.permissions) {
             const isSuperAdminEmail = firebaseUser.email === 'bijoymahmudmunna@gmail.com';
             const isAdmin = currentProfile.role === 'admin' || currentProfile.role === 'super_admin';
             currentProfile.permissions = {
                dashboard: isAdmin ? 'edit' : 'view',
                addData: isAdmin ? 'edit' : 'view',
                payments: isAdmin ? 'edit' : 'view',
                projects: isAdmin ? 'edit' : 'view',
                revenue: isAdmin ? 'edit' : 'view',
                tomorrowWork: isAdmin ? 'edit' : 'view',
                billing: isAdmin ? 'edit' : 'view'
             };
             if (isSuperAdminEmail) {
                currentProfile.isApproved = true;
                currentProfile.role = 'super_admin';
                currentProfile.permissions = {
                  dashboard: 'edit',
                  addData: 'edit',
                  payments: 'edit',
                  projects: 'edit',
                  revenue: 'edit',
                  tomorrowWork: 'edit',
                  billing: 'edit'
                };
             }
             await updateDoc(userDocRef, { 
                permissions: currentProfile.permissions,
                isApproved: currentProfile.isApproved,
                role: currentProfile.role
             });
          }

          setProfile(currentProfile);
        } else {
          // Default Super Admin for the specific email
          const isDefaultSuperAdmin = firebaseUser.email === 'bijoymahmudmunna@gmail.com';
          currentProfile = {
            uid: firebaseUser.uid,
            email: firebaseUser.email || '',
            displayName: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
            role: isDefaultSuperAdmin ? 'super_admin' : 'member',
            isApproved: isDefaultSuperAdmin, // Default Super Admin is auto-approved
            createdAt: new Date().toISOString(),
            permissions: {
              dashboard: isDefaultSuperAdmin ? 'edit' : 'none',
              addData: isDefaultSuperAdmin ? 'edit' : 'none',
              payments: isDefaultSuperAdmin ? 'edit' : 'none',
              projects: isDefaultSuperAdmin ? 'edit' : 'none',
              revenue: isDefaultSuperAdmin ? 'edit' : 'none',
              tomorrowWork: isDefaultSuperAdmin ? 'edit' : 'none',
              billing: isDefaultSuperAdmin ? 'edit' : 'none'
            }
          };
          await setDoc(userDocRef, currentProfile);
          setProfile(currentProfile);
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

  const isApproved = profile?.isApproved === true || (user?.email === 'bijoymahmudmunna@gmail.com');
  const isAdmin = isApproved && (profile?.role === 'admin' || profile?.role === 'super_admin');
  const isSuperAdmin = isApproved && profile?.role === 'super_admin';
  const isMember = isApproved && !!profile;

  return (
    <AuthContext.Provider value={{ user, profile, loading, isAdmin, isSuperAdmin, isMember, logout }}>
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
export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

function AppContent() {
  const { user, profile, loading, isAdmin, isSuperAdmin, isMember, logout } = useAuth();
  const [currentView, setCurrentView] = useState<View>('DASHBOARD');

  const [payments, setPayments] = useState<EmployeePayment[]>([]);
  const [projectExpenses, setProjectExpenses] = useState<ProjectExpense[]>([]);
  const [tomorrowWorkData, setTomorrowWorkData] = useState<{[date: string]: TomorrowWorkRow[]}>({});
  const [manpowerSuggestions, setManpowerSuggestions] = useState<string[]>([]);
  const [projectSuggestions, setProjectSuggestions] = useState<string[]>([]);
  const [addressSuggestions, setAddressSuggestions] = useState<string[]>([]);
  const [workSuggestions, setWorkSuggestions] = useState<string[]>([]);
  const [tomorrowWorkDate, setTomorrowWorkDate] = useState<string>(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  });
  const [currentTomorrowWorkRows, setCurrentTomorrowWorkRows] = useState<TomorrowWorkRow[]>([]);
  const [bills, setBills] = useState<Bill[]>([]);
  const [collectedBills, setCollectedBills] = useState<CollectedBill[]>([]);
  const [nextBillNumber, setNextBillNumber] = useState<number>(1);
  const [nextQuotationNumber, setNextQuotationNumber] = useState<number>(1);
  const [editingBill, setEditingBill] = useState<Bill | null>(null);
  const [pdfSettings, setPdfSettings] = useState<PDFSettings>(DEFAULT_PDF_SETTINGS);

  // --- Firestore Listeners ---
  useEffect(() => {
    if (!isMember) return;

    const unsubPayments = onSnapshot(collection(db, 'payments'), (snap) => {
      setPayments(snap.docs.map(doc => doc.data() as EmployeePayment));
    });

    const unsubExpenses = onSnapshot(collection(db, 'expenses'), (snap) => {
      setProjectExpenses(snap.docs.map(doc => doc.data() as ProjectExpense));
    });

    const unsubBills = onSnapshot(collection(db, 'bills'), (snap) => {
      const billsList = snap.docs.map(doc => doc.data() as Bill);
      setBills(billsList);
      
      // Update next numbers
      const maxBill = Math.max(0, ...billsList.filter(b => b.type === 'BILL').map(b => parseInt(b.billNumber.split('-')[1]) || 0));
      const maxQuo = Math.max(0, ...billsList.filter(b => b.type === 'QUOTATION').map(b => parseInt(b.billNumber.split('-')[1]) || 0));
      setNextBillNumber(maxBill + 1);
      setNextQuotationNumber(maxQuo + 1);
    });

    const unsubCollectedBills = onSnapshot(collection(db, 'collectedBills'), (snap) => {
      setCollectedBills(snap.docs.map(doc => doc.data() as CollectedBill));
    });

    const unsubSettings = onSnapshot(doc(db, 'settings', 'pdf'), (snap) => {
      if (snap.exists()) {
        setPdfSettings(snap.data() as PDFSettings);
      }
    });

    const unsubTomorrow = onSnapshot(doc(db, 'settings', 'tomorrowWork'), (snap) => {
      if (snap.exists()) {
        setTomorrowWorkData(snap.data() as {[date: string]: TomorrowWorkRow[]});
      }
    });

    return () => {
      unsubPayments();
      unsubExpenses();
      unsubBills();
      unsubCollectedBills();
      unsubSettings();
      unsubTomorrow();
    };
  }, [isMember]);

  // Load current rows when date changes
  useEffect(() => {
    const saved = tomorrowWorkData[tomorrowWorkDate];
    if (saved) {
      setCurrentTomorrowWorkRows(saved);
    } else {
      setCurrentTomorrowWorkRows([{
        id: crypto.randomUUID(),
        projectName: '',
        projectAddress: '',
        workDescription: '',
        manpowerList: [],
        overtime: ''
      }]);
    }
  }, [tomorrowWorkDate, tomorrowWorkData]);

  // Sync suggestions with tomorrowWorkData (history)
  useEffect(() => {
    const projects = new Set<string>();
    const addresses = new Set<string>();
    const works = new Set<string>();
    const manpower = new Set<string>();

    Object.values(tomorrowWorkData).forEach((dayRows: TomorrowWorkRow[]) => {
      dayRows.forEach(row => {
        if (row.projectName.trim()) projects.add(row.projectName.trim());
        if (row.projectAddress.trim()) addresses.add(row.projectAddress.trim());
        if (row.workDescription.trim()) works.add(row.workDescription.trim());
        row.manpowerList.forEach(m => {
          if (m.trim()) manpower.add(m.trim());
        });
      });
    });

    setProjectSuggestions(Array.from(projects).sort());
    setAddressSuggestions(Array.from(addresses).sort());
    setWorkSuggestions(Array.from(works).sort());
    setManpowerSuggestions(Array.from(manpower).sort());
  }, [tomorrowWorkData]);

  const [searchQuery, setSearchQuery] = useState('');
  const [historyFilter, setHistoryFilter] = useState<'Daily' | 'Monthly' | 'Annual' | 'Custom'>('Daily');

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const mainRef = useRef<HTMLDivElement>(null);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    setShowScrollTop(target.scrollTop > 200);
  };

  const scrollToTop = () => {
    mainRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const updateTomorrowWorkData = async (newData: {[date: string]: TomorrowWorkRow[]}) => {
    try {
      await setDoc(doc(db, 'settings', 'tomorrowWork'), newData);
    } catch (error: any) {
      console.error("Error updating tomorrow work data:", error);
      alert("Failed to save data. You may not have permission.");
      throw error; // Rethrow to catch in UI so it doesn't navigate
    }
  };

  const updatePdfSettings = async (newSettings: PDFSettings) => {
    try {
      await setDoc(doc(db, 'settings', 'pdf'), newSettings);
    } catch (error) {
      console.error("Error updating PDF settings:", error);
    }
  };

  const stats = useMemo(() => {
    const totalPayment = payments.reduce((sum, p) => sum + p.payment, 0);
    const totalEmployeeTransport = payments.reduce((sum, p) => sum + (p.transport || 0), 0);
    const totalTransport = projectExpenses.reduce((sum, p) => sum + p.transportCost, 0);
    const totalMaterials = projectExpenses.reduce((sum, p) => sum + p.materialsCost, 0);
    const totalOthers = projectExpenses.reduce((sum, p) => sum + p.othersCost, 0);

    const employeeCost = totalPayment + totalEmployeeTransport;
    const materialsCost = totalMaterials + totalTransport + totalOthers;
    const totalExpense = employeeCost + materialsCost;

    return {
      employeeCost,
      materialsCost,
      totalExpense
    };
  }, [payments, projectExpenses]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-4">
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
          className="w-12 h-12 border-4 border-[#0D47A1] border-t-transparent rounded-full mb-4"
        />
        <p className="text-[#64748B] font-medium animate-pulse">Initializing Application...</p>
      </div>
    );
  }

  if (!user) {
    return <LoginView />;
  }

  if (profile && !profile.isApproved && user?.email !== 'bijoymahmudmunna@gmail.com') {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-6 text-center">
        <div className="bg-white p-8 rounded-3xl shadow-xl max-w-sm w-full border border-slate-100">
          <div className="w-20 h-20 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <ShieldAlert className="w-10 h-10 text-amber-500" />
          </div>
          <h2 className="text-2xl font-bold text-slate-800 mb-3">Approval Pending</h2>
          <p className="text-slate-600 mb-8">
            Your account is waiting for Super Admin approval. Please contact the administrator to get access.
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

  const addPayment = async (payment: Omit<EmployeePayment, 'id'>) => {
    try {
      const id = crypto.randomUUID();
      await setDoc(doc(db, 'payments', id), { ...payment, id, createdBy: user?.uid });
    } catch (error: any) {
      console.error("Error adding payment:", error);
      alert("Failed to save data. You may not have permission.");
      throw error;
    }
  };

  const addProjectExpense = async (expense: Omit<ProjectExpense, 'id'>) => {
    try {
      const id = crypto.randomUUID();
      await setDoc(doc(db, 'expenses', id), { ...expense, id, createdBy: user?.uid });
    } catch (error: any) {
      console.error("Error adding expense:", error);
      alert("Failed to save data. You may not have permission.");
      throw error;
    }
  };

  const addCollectedBill = async (bill: Omit<CollectedBill, 'id'>) => {
    try {
      const id = crypto.randomUUID();
      await setDoc(doc(db, 'collectedBills', id), { ...bill, id, createdBy: user?.uid });
    } catch (error: any) {
      console.error("Error adding collected bill:", error);
      alert("Failed to collect bill. You may not have permission.");
      throw error;
    }
  };

  const deleteCollectedBill = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'collectedBills', id));
    } catch (error) {
      console.error("Error deleting collected bill:", error);
    }
  };

  const deletePayment = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'payments', id));
    } catch (error) {
      console.error("Error deleting payment:", error);
    }
  };

  const deletePayments = async (ids: string[]) => {
    try {
      for (const id of ids) {
        await deleteDoc(doc(db, 'payments', id));
      }
    } catch (error) {
      console.error("Error deleting payments:", error);
    }
  };

  const updatePayment = async (id: string, updated: Partial<EmployeePayment>) => {
    try {
      await updateDoc(doc(db, 'payments', id), updated);
    } catch (error) {
      console.error("Error updating payment:", error);
    }
  };

  const deleteProjectExpense = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'expenses', id));
    } catch (error) {
      console.error("Error deleting expense:", error);
    }
  };

  const deleteProjectExpenses = async (ids: string[]) => {
    try {
      for (const id of ids) {
        await deleteDoc(doc(db, 'expenses', id));
      }
    } catch (error) {
      console.error("Error deleting expenses:", error);
    }
  };

  const updateProjectExpense = async (id: string, updated: Partial<ProjectExpense>) => {
    try {
      await updateDoc(doc(db, 'expenses', id), updated);
    } catch (error) {
      console.error("Error updating expense:", error);
    }
  };

  const updateProjectBudget = async (projectName: string, newBudget: number) => {
    const existingProject = projectExpenses.find(pe => pe.projectName.trim().toLowerCase() === projectName.trim().toLowerCase());
    
    if (existingProject) {
      try {
        await updateDoc(doc(db, 'expenses', existingProject.id), { budget: newBudget });
      } catch (error) {
        console.error("Error updating budget:", error);
      }
    } else {
      try {
        const id = crypto.randomUUID();
        await setDoc(doc(db, 'expenses', id), {
          id,
          uniqueId: 'ATP-' + Math.floor(Math.random() * 1000000).toString().padStart(6, '0'),
          projectName: projectName,
          timestamp: new Date().toLocaleString('en-GB'),
          materialsCost: 0,
          transportCost: 0,
          othersCost: 0,
          budget: newBudget,
          createdBy: user?.uid
        });
      } catch (error) {
        console.error("Error creating project with budget:", error);
      }
    }
  };

  const renderView = () => {
    switch (currentView) {
      case 'DASHBOARD':
        return <DashboardView stats={stats} payments={payments} projectExpenses={projectExpenses} onDetails={() => setCurrentView('PAYMENT_HISTORY')} />;
      case 'PAYMENT_HISTORY':
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
            isAdmin={isAdmin}
          />
        );
      case 'PROJECT_SUMMARY':
        if (!isAdmin) return <DashboardView stats={stats} payments={payments} projectExpenses={projectExpenses} onDetails={() => setCurrentView('PAYMENT_HISTORY')} />;
        return <ProjectSummaryView payments={payments} projectExpenses={projectExpenses} />;
      case 'REVENUE':
        if (!isAdmin) return <DashboardView stats={stats} payments={payments} projectExpenses={projectExpenses} onDetails={() => setCurrentView('PAYMENT_HISTORY')} />;
        return <RevenueView 
          projectExpenses={projectExpenses} 
          payments={payments} 
          collectedBills={collectedBills}
          onAddCollectedBill={addCollectedBill}
          onDeleteCollectedBill={deleteCollectedBill}
          onUpdateBudget={updateProjectBudget} 
          isAdmin={isAdmin} 
        />;
      case 'EMPLOYEE_TOTALS':
        return <EmployeeTotalsView payments={payments} onBack={() => setCurrentView('DASHBOARD')} />;
      case 'EXPORT':
        if (!isAdmin) return <DashboardView stats={stats} payments={payments} projectExpenses={projectExpenses} onDetails={() => setCurrentView('PAYMENT_HISTORY')} />;
        return <ExportView 
          payments={payments} 
          projectExpenses={projectExpenses} 
          bills={bills}
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
          onBack={() => setCurrentView('DASHBOARD')} 
        />;
      case 'ABOUT':
        return <AboutView 
          onBack={() => setCurrentView('DASHBOARD')} 
          onContactClick={() => setCurrentView('CONTACT_INFO')}
        />;
      case 'CLOUD_SYNC':
        if (!isAdmin) return <DashboardView stats={stats} payments={payments} projectExpenses={projectExpenses} onDetails={() => setCurrentView('PAYMENT_HISTORY')} />;
        return <CloudSyncView payments={payments} projectExpenses={projectExpenses} onBack={() => setCurrentView('DASHBOARD')} />;
      case 'CONTACT_INFO':
        return <ContactInfoView onBack={() => setCurrentView('DASHBOARD')} />;
      case 'TOMORROW_WORK':
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
            onBack={() => setCurrentView('DASHBOARD')} 
            onViewHistory={() => setCurrentView('TOMORROW_WORK_HISTORY')}
            isAdmin={isAdmin}
            onSave={async () => {
              const isDataEmpty = currentTomorrowWorkRows.every(row => 
                !row.projectName.trim() && 
                !row.projectAddress.trim() && 
                !row.workDescription.trim() && 
                row.manpowerList.length === 0 &&
                !row.overtime.trim()
              );

              if (isDataEmpty) {
                alert("Cannot save empty data to history.");
                return;
              }

              try {
                await updateTomorrowWorkData({
                  ...tomorrowWorkData,
                  [tomorrowWorkDate]: currentTomorrowWorkRows
                });
                setCurrentView('TOMORROW_WORK_DETAILS');
              } catch (e) {
                // error handled in updateTomorrowWorkData
              }
            }}
          />
        );
      case 'TOMORROW_WORK_DETAILS':
        return (
          <TomorrowWorkDetailsView 
            rows={currentTomorrowWorkRows} 
            date={tomorrowWorkDate} 
            onBack={() => setCurrentView('TOMORROW_WORK')} 
          />
        );
      case 'ADD_DATA':
        if (!isAdmin) return <DashboardView stats={stats} payments={payments} projectExpenses={projectExpenses} onDetails={() => setCurrentView('PAYMENT_HISTORY')} />;
        return <AddDataView onAddPayment={addPayment} onAddProject={addProjectExpense} onBack={() => setCurrentView('DASHBOARD')} payments={payments} projectExpenses={projectExpenses} />;
      case 'TOMORROW_WORK_HISTORY':
        return (
          <TomorrowWorkHistoryView 
            data={tomorrowWorkData} 
            onBack={() => setCurrentView('TOMORROW_WORK')} 
            onSelectDate={(date) => {
              setTomorrowWorkDate(date);
              setCurrentView('TOMORROW_WORK');
            }}
            isAdmin={isAdmin}
            onDeleteDate={async (date) => {
              const newData = { ...tomorrowWorkData };
              delete newData[date];
              await updateTomorrowWorkData(newData);
            }}
          />
        );
      case 'BILL':
        if (!isAdmin) return <DashboardView stats={stats} payments={payments} projectExpenses={projectExpenses} onDetails={() => setCurrentView('PAYMENT_HISTORY')} />;
        return (
          <BillView 
            type="BILL" 
            nextNumber={nextBillNumber} 
            initialBill={editingBill || undefined}
            pdfSettings={pdfSettings}
            onSave={async (bill) => { 
              try {
                if (editingBill) {
                  await updateDoc(doc(db, 'bills', bill.id), bill as any);
                  setEditingBill(null);
                } else {
                  await setDoc(doc(db, 'bills', bill.id), { ...bill, createdBy: user?.uid }); 
                }
                setCurrentView('BILL_HISTORY'); 
              } catch (error) {
                console.error("Error saving bill:", error);
              }
            }} 
            onBack={() => { setEditingBill(null); setCurrentView('DASHBOARD'); }} 
          />
        );
      case 'QUOTATION':
        if (!isAdmin) return <DashboardView stats={stats} payments={payments} projectExpenses={projectExpenses} onDetails={() => setCurrentView('PAYMENT_HISTORY')} />;
        return (
          <BillView 
            type="QUOTATION" 
            nextNumber={nextQuotationNumber} 
            initialBill={editingBill || undefined}
            pdfSettings={pdfSettings}
            onSave={async (bill) => { 
              try {
                if (editingBill) {
                  await updateDoc(doc(db, 'bills', bill.id), bill as any);
                  setEditingBill(null);
                } else {
                  await setDoc(doc(db, 'bills', bill.id), { ...bill, createdBy: user?.uid }); 
                }
                setCurrentView('BILL_HISTORY'); 
              } catch (error) {
                console.error("Error saving quotation:", error);
              }
            }} 
            onBack={() => { setEditingBill(null); setCurrentView('DASHBOARD'); }} 
          />
        );
      case 'BILL_HISTORY':
        if (!isAdmin) return <DashboardView stats={stats} payments={payments} projectExpenses={projectExpenses} onDetails={() => setCurrentView('PAYMENT_HISTORY')} />;
        return (
          <BillHistoryView 
            bills={bills} 
            onEdit={(bill) => {
              setEditingBill(bill);
              setCurrentView(bill.type === 'BILL' ? 'BILL' : 'QUOTATION');
            }}
            onBack={() => setCurrentView('DASHBOARD')}
            pdfSettings={pdfSettings}
            isAdmin={isAdmin}
          />
        );
      case 'PDF_SETTINGS':
        if (!isAdmin) return <DashboardView stats={stats} payments={payments} projectExpenses={projectExpenses} onDetails={() => setCurrentView('PAYMENT_HISTORY')} />;
        return <PDFSettingsView settings={pdfSettings} onSave={updatePdfSettings} onBack={() => setCurrentView('DASHBOARD')} />;
      case 'USERS':
        return isSuperAdmin ? <UserManagementView onBack={() => setCurrentView('DASHBOARD')} /> : <DashboardView stats={stats} payments={payments} projectExpenses={projectExpenses} onDetails={() => setCurrentView('PAYMENT_HISTORY')} />;
      default:
        return <DashboardView stats={stats} payments={payments} projectExpenses={projectExpenses} onDetails={() => setCurrentView('PAYMENT_HISTORY')} />;
    }
  };

  return (
    <div className="h-screen bg-[#E8F0F8] text-[#1A237E] font-sans flex flex-col overflow-hidden">
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
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed top-0 left-0 bottom-0 w-72 bg-[#F8FAFC] z-[110] shadow-2xl flex flex-col"
            >
              {/* Sidebar Header with Gradient */}
              <div className="p-6 bg-gradient-to-br from-[#0D47A1] to-[#1A237E] text-white relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl" />
                <div className="absolute bottom-0 left-0 w-24 h-24 bg-blue-400/20 rounded-full -ml-12 -mb-12 blur-xl" />
                
                <div className="flex justify-between items-start relative z-10">
                  <div className="flex flex-col gap-1">
                    <h2 className="font-bold text-xl tracking-tight">Altasmim Engineering</h2>
                    <p className="text-blue-100 text-[10px] font-medium uppercase tracking-[0.2em]">Project Tracker</p>
                  </div>
                  <button 
                    onClick={() => setIsSidebarOpen(false)}
                    className="p-2 hover:bg-white/20 rounded-xl transition-all cursor-pointer active:scale-90"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Sidebar Menu Items */}
              <div className="flex-1 py-6 px-4 space-y-2 overflow-y-auto custom-scrollbar">
                <p className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-[0.15em] px-3 mb-3">Navigation</p>
                {[
                  { view: 'DASHBOARD', label: 'Overview', value: 'Dashboard', icon: <LayoutDashboard className="w-5 h-5" />, bg: 'bg-blue-50', color: 'text-blue-600' },
                  { view: 'TOMORROW_WORK', label: 'Planning', value: "Tomorrow's Work", icon: <Calendar className="w-5 h-5" />, bg: 'bg-emerald-50', color: 'text-emerald-600' },
                  ...(isAdmin ? [
                    { view: 'BILL', label: 'Create', value: 'New Bill', icon: <Receipt className="w-5 h-5" />, bg: 'bg-indigo-50', color: 'text-indigo-600' },
                    { view: 'QUOTATION', label: 'Create', value: 'New Quotation', icon: <FileText className="w-5 h-5" />, bg: 'bg-purple-50', color: 'text-purple-600' },
                    { view: 'BILL_HISTORY', label: 'Records', value: 'History & Logs', icon: <History className="w-5 h-5" />, bg: 'bg-amber-50', color: 'text-amber-600' },
                    { view: 'PDF_SETTINGS', label: 'Custom', value: 'PDF Settings', icon: <Printer className="w-5 h-5" />, bg: 'bg-orange-50', color: 'text-orange-600' },
                  ] : []),
                  { view: 'EMPLOYEE_TOTALS', label: 'Payments', value: 'Employee Details', icon: <TrendingUp className="w-5 h-5" />, bg: 'bg-green-50', color: 'text-green-600' },
                  ...(isAdmin ? [
                    { view: 'EXPORT', label: 'Data', value: 'Export & Backup', icon: <Download className="w-5 h-5" />, bg: 'bg-slate-50', color: 'text-slate-600' },
                    { view: 'CLOUD_SYNC', label: 'Cloud', value: 'Google Drive Sync', icon: <Cloud className="w-5 h-5" />, bg: 'bg-sky-50', color: 'text-sky-600' },
                  ] : []),
                  ...(isSuperAdmin ? [{ view: 'USERS', label: 'Admin', value: 'User Management', icon: <UsersIcon className="w-5 h-5" />, bg: 'bg-rose-50', color: 'text-rose-600' }] : []),
                  { view: 'ABOUT', label: 'Developer', value: 'About Me', icon: <Info className="w-5 h-5" />, bg: 'bg-slate-50', color: 'text-slate-600' },
                  { view: 'CONTACT_INFO', label: 'Support', value: 'Contact Details', icon: <Phone className="w-5 h-5" />, bg: 'bg-rose-50', color: 'text-rose-600' },
                ].map((item, index) => (
                  <motion.button 
                    key={index}
                    initial={{ opacity: 0, x: -15 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.04, type: 'spring', stiffness: 100 }}
                    onClick={() => { setCurrentView(item.view as View); setIsSidebarOpen(false); }}
                    className={`w-full flex items-center gap-3.5 p-2.5 rounded-xl transition-all active:scale-[0.97] group relative overflow-hidden text-left ${
                      currentView === item.view 
                        ? 'bg-white shadow-md border border-blue-100' 
                        : 'hover:bg-white/60 border border-transparent hover:border-slate-200'
                    }`}
                  >
                    <div className={`w-10 h-10 ${item.bg} ${item.color} rounded-lg flex items-center justify-center group-hover:scale-105 transition-transform duration-300 shadow-sm`}>
                      {item.icon}
                    </div>
                    <div className="flex-1">
                      <p className={`text-[8px] font-bold uppercase tracking-wider mb-0.5 ${currentView === item.view ? 'text-blue-500' : 'text-slate-400'}`}>
                        {item.label}
                      </p>
                      <p className={`text-[13px] font-bold transition-colors ${currentView === item.view ? 'text-[#0D47A1]' : 'text-slate-600 group-hover:text-slate-900'}`}>
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
                  <div className="w-10 h-10 rounded-full bg-[#0D47A1] flex items-center justify-center text-white font-bold shadow-sm">
                    {user?.displayName?.charAt(0) || 'U'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-[#1E293B] truncate">{user?.displayName}</p>
                    <p className="text-[10px] font-medium text-[#64748B] uppercase tracking-wider flex items-center gap-1">
                      {isSuperAdmin ? <ShieldCheck className="w-3 h-3 text-rose-500" /> : isAdmin ? <ShieldAlert className="w-3 h-3 text-amber-500" /> : <Shield className="w-3 h-3 text-blue-500" />}
                      {profile?.role.replace('_', ' ')}
                    </p>
                  </div>
                </div>
                <button 
                  onClick={logout}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-white border border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-50 hover:text-rose-600 hover:border-rose-200 transition-all active:scale-[0.98]"
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
            {currentView === 'TOMORROW_WORK' ? 'Tomorrow Work' : 'Altasmim Engineering'}
          </h1>
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
      {currentView === 'DASHBOARD' && isAdmin && (
        <button
          onClick={() => setCurrentView('ADD_DATA')}
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
            className="text-xs font-bold text-[#0D47A1] hover:underline"
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
        <NavButton 
          active={currentView === 'TOMORROW_WORK'} 
          onClick={() => setCurrentView('TOMORROW_WORK')}
          icon={<Calendar className="w-5 h-5" />}
          label="TOMORROW WORK"
          color="#ED7D31"
        />
        <NavButton 
          active={currentView === 'PAYMENT_HISTORY'} 
          onClick={() => setCurrentView('PAYMENT_HISTORY')}
          icon={<History className="w-5 h-5" />}
          label="PAYMENT HISTORY"
          color="#2E7D32"
        />
        <NavButton 
          active={currentView === 'DASHBOARD'} 
          onClick={() => setCurrentView('DASHBOARD')}
          icon={<LayoutDashboard className="w-5 h-5" />}
          label="HOME"
          color="#0D47A1"
        />
        {isAdmin && (
          <>
            <NavButton 
              active={currentView === 'PROJECT_SUMMARY'} 
              onClick={() => setCurrentView('PROJECT_SUMMARY')}
              icon={<BarChart3 className="w-5 h-5" />}
              label="PROJECT SUMMARY"
              color="#7B1FA2"
            />
            <NavButton 
              active={currentView === 'REVENUE'} 
              onClick={() => setCurrentView('REVENUE')}
              icon={<TrendingUp className="w-5 h-5" />}
              label="REVENUE"
              color="#00897B"
            />
          </>
        )}
      </nav>
    </div>
  );
}

function NavButton({ active, onClick, icon, label, color = '#0D47A1' }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string, color?: string }) {
  return (
    <button 
      onClick={onClick}
      className={`flex flex-col items-center gap-1 p-2 transition-all duration-200 cursor-pointer rounded-lg ${
        active 
          ? 'scale-105' 
          : 'text-[#78909C] hover:bg-[#F5F5F5]'
      }`}
      style={{ 
        color: active ? color : undefined,
        backgroundColor: active ? `${color}15` : undefined // 15 is ~8% opacity in hex
      }}
    >
      <div style={{ color: active ? color : undefined }}>
        {icon}
      </div>
      <span className="text-[9px] font-bold text-center leading-tight">{label}</span>
    </button>
  );
}

// --- Views ---

function DashboardView({ stats, payments, projectExpenses, onDetails }: { 
  stats: { employeeCost: number, materialsCost: number, totalExpense: number }, 
  payments: EmployeePayment[], 
  projectExpenses: ProjectExpense[],
  onDetails: () => void 
}) {
  const COLORS = ['#0D47A1', '#2E7D32', '#FFB300', '#ED7D31', '#7B1FA2', '#00897B'];

  const projectTotals = useMemo(() => {
    const totals: Record<string, { name: string, cost: number }> = {};
    
    payments.forEach(p => {
      const key = p.projectName.trim().toLowerCase();
      if (!totals[key]) totals[key] = { name: p.projectName, cost: 0 };
      totals[key].cost += p.payment + (p.transport || 0);
    });
    
    projectExpenses.forEach(p => {
      const key = p.projectName.trim().toLowerCase();
      if (!totals[key]) totals[key] = { name: p.projectName, cost: 0 };
      const cost = p.materialsCost + p.transportCost + p.othersCost;
      totals[key].cost += cost;
    });

    return Object.values(totals).slice(0, 5); // Show top 5 or first 5
  }, [payments, projectExpenses]);

  const pieData = useMemo(() => {
    const empPayment = payments.reduce((sum, p) => sum + p.payment, 0);
    const empTransport = payments.reduce((sum, p) => sum + (p.transport || 0), 0);
    const materials = projectExpenses.reduce((sum, p) => sum + p.materialsCost, 0);
    const projTransport = projectExpenses.reduce((sum, p) => sum + p.transportCost, 0);
    const others = projectExpenses.reduce((sum, p) => sum + p.othersCost, 0);

    return [
      { name: 'Employee Payments', value: empPayment },
      { name: 'Employee Transport', value: empTransport },
      { name: 'Materials', value: materials },
      { name: 'Others', value: others },
      { name: 'Project Transport', value: projTransport },
    ].filter(d => d.value > 0).map(d => ({
      ...d,
      name: `${d.name} (${formatCurrency(d.value)})`
    }));
  }, [payments, projectExpenses]);

  const monthlyData = useMemo(() => {
    const months: Record<string, number> = {};
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    
    const processItem = (item: { timestamp: string, cost: number }) => {
      try {
        // Expected format: "DD/MM/YYYY, HH:MM:SS"
        const datePart = item.timestamp.split(',')[0];
        const parts = datePart.split('/');
        if (parts.length === 3) {
          const m = parseInt(parts[1]);
          const y = parts[2].trim();
          const sortKey = `${y}-${parts[1].padStart(2, '0')}`;
          months[sortKey] = (months[sortKey] || 0) + item.cost;
        }
      } catch (e) {
        console.error("Error parsing date:", item.timestamp);
      }
    };

    payments.forEach(p => processItem({ timestamp: p.timestamp, cost: p.payment + (p.transport || 0) }));
    projectExpenses.forEach(p => processItem({ timestamp: p.timestamp, cost: p.materialsCost + p.transportCost + p.othersCost }));

    return Object.entries(months)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([key, total]) => {
        const [year, month] = key.split('-');
        return { 
          month: `${monthNames[parseInt(month) - 1]} ${year}`, 
          total 
        };
      })
      .slice(-6); // Last 6 months
  }, [payments, projectExpenses]);

  return (
    <div className="space-y-6 pb-10">
      <h2 className="text-xl font-bold border-b-2 border-[#0D47A1] inline-block pb-1 text-[#FF9900]">Dashboard</h2>
      
      {/* Expense Cards */}
      <div className="grid grid-cols-1 gap-4">
        {/* Total Expense Card */}
        <div className="bg-white rounded-2xl p-6 shadow-xl border border-[#B0BEC5] text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-[#0D47A1]/10" />
          <p className="text-[#FF9900] font-bold mb-2 flex items-center justify-center gap-2">
            ---------- Total Expense ----------
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

          {/* Compact Project Summary inside the card */}
          <div className="mt-6">
            <div className="overflow-hidden rounded-lg border border-[#B0BEC5]/30">
              <table className="w-full text-[10px] text-left">
                <tbody>
                  {projectTotals.map((p, i) => (
                    <tr key={p.name} className={i % 2 === 0 ? 'bg-white' : 'bg-[#F5F9FD]'}>
                      <td className="p-1.5 border-r border-[#B0BEC5]/20 truncate max-w-[120px]">{p.name}</td>
                      <td className="p-1.5 font-bold text-right">{formatCurrency(p.cost)}</td>
                    </tr>
                  ))}
                  {projectTotals.length === 0 && (
                    <tr>
                      <td colSpan={2} className="p-4 text-center text-[#78909C]">No data</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <button 
            onClick={onDetails}
            className="mt-4 text-[#0D47A1] font-bold text-xs hover:underline cursor-pointer"
          >
            View Details
          </button>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 gap-6">
        <div className="text-center px-4 bg-[#E3F2FD] py-2 rounded-lg border border-[#B0BEC5]/30">
          <p className="text-[10px] text-[#0D47A1] font-bold italic flex items-center justify-center gap-2">
            <Info className="w-3 h-3" />
            Visual summary of your spending patterns across projects and months.
          </p>
        </div>
        {/* Pie Chart */}
        <div className="bg-white rounded-2xl p-4 shadow-lg border border-[#B0BEC5]">
          <h3 className="text-sm font-bold text-[#0D47A1] mb-4 flex items-center gap-2">
            <PieChartIcon className="w-4 h-4" />
            Expense Distribution
          </h3>
          <div className="h-80 w-full">
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="45%"
                    innerRadius={50}
                    outerRadius={75}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: number) => formatCurrency(value)}
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                  />
                  <Legend 
                    verticalAlign="bottom" 
                    align="left"
                    wrapperStyle={{ 
                      paddingTop: '5px',
                      paddingLeft: '10px',
                      fontSize: '10px',
                      fontWeight: 'bold',
                      lineHeight: '1.6'
                    }}
                    iconSize={10}
                    iconType="circle"
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-[#78909C] text-sm">
                No data for distribution
              </div>
            )}
          </div>
        </div>

        {/* Bar Chart */}
        <div className="bg-white rounded-2xl p-4 shadow-lg border border-[#B0BEC5]">
          <h3 className="text-sm font-bold text-[#0D47A1] mb-4 flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            Monthly Expenses
          </h3>
          <div className="h-64 w-full">
            {monthlyData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E0E0E0" />
                  <XAxis 
                    dataKey="month" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 10, fontWeight: 'bold', fill: '#78909C' }} 
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 10, fontWeight: 'bold', fill: '#78909C' }}
                    tickFormatter={(value) => value >= 1000 ? `${(value / 1000).toFixed(0)}k` : value}
                  />
                  <Tooltip 
                    formatter={(value: number) => formatCurrency(value)}
                    cursor={{ fill: '#F5F9FD' }}
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                  />
                  <Bar dataKey="total" fill="#0D47A1" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-[#78909C] text-sm">
                No monthly data available
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Payment History Table */}
      <div className="space-y-4">
        <h3 className="text-center text-[#0D47A1] font-bold underline">Recent Data</h3>
        <div className="overflow-hidden rounded-lg border border-[#B0BEC5] bg-white">
          <table className="w-full text-xs text-left">
            <thead className="bg-[#FFB300] text-white">
              <tr>
                <th className="p-2 border-r border-white/20">Date</th>
                <th className="p-2 border-r border-white/20">Name</th>
                <th className="p-2 border-r border-white/20">Project</th>
                <th className="p-2">Payment</th>
              </tr>
            </thead>
            <tbody>
              {payments.slice(-5).reverse().map((p, i) => (
                <tr key={p.id} className={i % 2 === 0 ? 'bg-white' : 'bg-[#F5F9FD]'}>
                  <td className="p-2 border-r border-[#B0BEC5]/30">{p.timestamp}</td>
                  <td className="p-2 border-r border-[#B0BEC5]/30">{p.employeeName}</td>
                  <td className="p-2 border-r border-[#B0BEC5]/30">{p.projectName}</td>
                  <td className="p-2 font-bold">{formatCurrency(p.payment + (p.transport || 0))}</td>
                </tr>
              ))}
              {payments.length === 0 && (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-[#78909C]">No data available</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function AddDataView({ onAddPayment, onAddProject, onBack, payments, projectExpenses }: { 
  onAddPayment: (p: Omit<EmployeePayment, 'id'>) => void, 
  onAddProject: (p: Omit<ProjectExpense, 'id'>) => void,
  onBack: () => void,
  payments: EmployeePayment[],
  projectExpenses: ProjectExpense[]
}) {
  const [empForm, setEmpForm] = useState({
    uniqueId: 'ATE-' + Math.floor(Math.random() * 1000000).toString().padStart(6, '0'),
    timestamp: new Date().toLocaleString('en-GB'),
    employeeName: '',
    projectName: '',
    payment: '',
    transport: ''
  });

  const [projForm, setProjForm] = useState({
    uniqueId: 'ATP-' + Math.floor(Math.random() * 1000000).toString().padStart(6, '0'),
    projectName: '',
    materialsCost: '',
    transportCost: '',
    othersCost: ''
  });

  // Extract unique names for suggestions, ignoring case sensitivity
  const employeeNames = Array.from(
    new Map(
      payments.map(p => p.employeeName)
        .filter(Boolean)
        .map(name => [name.trim().toLowerCase(), name.trim()])
    ).values()
  );

  const projectNames = Array.from(
    new Map(
      [...payments.map(p => p.projectName), ...projectExpenses.map(p => p.projectName)]
        .filter(Boolean)
        .map(name => [name.trim().toLowerCase(), name.trim()])
    ).values()
  );

  const handleSave = async () => {
    let saved = false;

    try {
      if (empForm.employeeName && empForm.projectName && (empForm.payment || empForm.transport)) {
        await onAddPayment({
          ...empForm,
          payment: parseFloat(empForm.payment || '0'),
          transport: parseFloat(empForm.transport || '0')
        });
        saved = true;
      }
      
      if (projForm.projectName && (projForm.materialsCost || projForm.transportCost || projForm.othersCost)) {
        await onAddProject({
          ...projForm,
          timestamp: new Date().toLocaleString('en-GB'),
          materialsCost: parseFloat(projForm.materialsCost || '0'),
          transportCost: parseFloat(projForm.transportCost || '0'),
          othersCost: parseFloat(projForm.othersCost || '0'),
          budget: 0
        });
        saved = true;
      }

      if (saved) {
        alert('Data saved successfully!');
        onBack();
      } else {
        alert('Please fill in at least one section (Employee or Project) with required fields.');
      }
    } catch (error) {
      // Errors are alerted inside the onAdd... functions, so just do nothing here.
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <button 
          onClick={onBack} 
          className="p-1 hover:bg-[#F5F5F5] rounded-full transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h2 className="text-xl font-bold border-b-2 border-[#0D47A1] inline-block pb-1">Add Data</h2>
      </div>

      {/* For Employee Section */}
      <div className="bg-white rounded-xl shadow-md border border-[#B0BEC5] overflow-hidden">
        <div className="bg-[#BBDEFB] p-2 text-center text-[#0D47A1] font-bold text-sm">FOR EMPLOYEE</div>
        <div className="p-4 space-y-3">
          <InputField label="UNIQUE ID:" value={empForm.uniqueId} readOnly />
          <InputField label="TIMESTAMP:" value={empForm.timestamp} onChange={v => setEmpForm({...empForm, timestamp: v})} />
          <InputField 
            label="EMPLOYEE NAME:" 
            value={empForm.employeeName} 
            onChange={v => setEmpForm({...empForm, employeeName: v})} 
            suggestions={employeeNames}
          />
          <InputField 
            label="PROJECT NAME:" 
            value={empForm.projectName} 
            onChange={v => setEmpForm({...empForm, projectName: v})} 
            suggestions={projectNames}
          />
          <InputField label="PAYMENT:" type="number" value={empForm.payment} onChange={v => setEmpForm({...empForm, payment: v})} />
          <InputField label="TRANSPORT:" type="number" value={empForm.transport} onChange={v => setEmpForm({...empForm, transport: v})} />
        </div>
      </div>

      {/* For Project Section */}
      <div className="bg-white rounded-xl shadow-md border border-[#B0BEC5] overflow-hidden">
        <div className="bg-[#BBDEFB] p-2 text-center text-[#0D47A1] font-bold text-sm">FOR PROJECT</div>
        <div className="p-4 space-y-3">
          <InputField label="UNIQUE ID:" value={projForm.uniqueId} readOnly />
          <InputField 
            label="PROJECT NAME:" 
            value={projForm.projectName} 
            onChange={v => setProjForm({...projForm, projectName: v})} 
            suggestions={projectNames}
          />
          <InputField label="MATERIALS COST:" type="number" value={projForm.materialsCost} onChange={v => setProjForm({...projForm, materialsCost: v})} />
          <InputField label="TRANSPORT:" type="number" value={projForm.transportCost} onChange={v => setProjForm({...projForm, transportCost: v})} />
          <InputField label="OTHERS COST:" type="number" value={projForm.othersCost} onChange={v => setProjForm({...projForm, othersCost: v})} />
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

function InputField({ label, value, onChange, readOnly, type = "text", suggestions = [] }: { 
  label: string, 
  value: string, 
  onChange?: (v: string) => void, 
  readOnly?: boolean,
  type?: string,
  suggestions?: string[]
}) {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const filteredSuggestions = suggestions.filter(s => 
    s.toLowerCase().includes(value.toLowerCase()) && s.toLowerCase() !== value.toLowerCase()
  ).slice(0, 5);

  return (
    <div className="flex flex-col gap-1 relative">
      <div className="flex items-center gap-2">
        <label className="w-1/3 text-[10px] font-bold bg-[#CFD8DC] p-2 rounded">{label}</label>
        <div className="w-2/3 relative">
          <input 
            type={type}
            className={`w-full border-2 border-[#0D47A1] rounded p-1 text-sm font-bold ${readOnly ? 'bg-[#F5F5F5] text-[#78909C] border-[#B0BEC5]' : 'bg-white'}`}
            value={value}
            onChange={e => {
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
  isAdmin
}: { 
  payments: EmployeePayment[], 
  projectExpenses: ProjectExpense[],
  filter: string, 
  setFilter: (f: any) => void,
  onDeletePayment: (id: string) => void,
  onDeletePayments: (ids: string[]) => void,
  onUpdatePayment: (id: string, updated: Partial<EmployeePayment>) => void,
  onDeleteProject: (id: string) => void,
  onDeleteProjects: (ids: string[]) => void,
  onUpdateProject: (id: string, updated: Partial<ProjectExpense>) => void,
  isAdmin: boolean
}) {
  const [activeTab, setActiveTab] = useState<'EMPLOYEE' | 'PROJECT'>('EMPLOYEE');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<any>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showConfirm, setShowConfirm] = useState<{ id?: string, ids?: string[] } | null>(null);

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
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
      if (activeTab === 'EMPLOYEE') onDeletePayment(showConfirm.id);
      else onDeleteProject(showConfirm.id);
    } else if (showConfirm.ids) {
      if (activeTab === 'EMPLOYEE') onDeletePayments(showConfirm.ids);
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
    if (activeTab === 'EMPLOYEE') {
      onUpdatePayment(editingId!, {
        ...editForm,
        payment: parseFloat(editForm.payment || '0'),
        transport: parseFloat(editForm.transport || '0')
      });
    } else {
      onUpdateProject(editingId!, {
        ...editForm,
        materialsCost: parseFloat(editForm.materialsCost),
        transportCost: parseFloat(editForm.transportCost),
        othersCost: parseFloat(editForm.othersCost)
      });
    }
    setEditingId(null);
    setEditForm(null);
  };

  const parseDate = (dateStr: string) => {
    try {
      const [datePart] = dateStr.split(',');
      const [day, month, year] = datePart.trim().split('/');
      return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    } catch (e) {
      return new Date(0);
    }
  };

  const years = Array.from({ length: 26 }, (_, i) => 2025 + i);
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const filteredData = useMemo(() => {
    const now = new Date();
    const data = activeTab === 'EMPLOYEE' ? payments : projectExpenses;

    return data.filter(item => {
      const itemDate = parseDate(item.timestamp);
      
      switch (filter) {
        case 'Daily':
          // "daily tab a sob tarikher data dekhabe" - Show all data
          return true;
        case 'Monthly':
          return itemDate.getMonth() === selectedMonth && itemDate.getFullYear() === selectedYear;
        case 'Annual':
          return itemDate.getFullYear() === selectedYear;
        case 'Custom':
          if (!startDate || !endDate) return true;
          const s = new Date(startDate);
          const e = new Date(endDate);
          s.setHours(0, 0, 0, 0);
          e.setHours(23, 59, 59, 999);
          return itemDate >= s && itemDate <= e;
        default:
          return true;
      }
    }).reverse();
  }, [payments, projectExpenses, activeTab, filter, startDate, endDate, selectedYear, selectedMonth]);

  return (
    <div className="space-y-4 md:space-y-6">
      <h2 className="text-lg md:text-xl font-bold border-b-2 border-[#0D47A1] inline-block pb-1 text-[#FF9900]">Payment History</h2>
      
      {/* Tabs */}
      <div className="flex border-b border-[#B0BEC5] overflow-x-auto no-scrollbar">
        <button 
          onClick={() => setActiveTab('EMPLOYEE')}
          className={`flex-1 py-2 px-4 text-xs md:text-sm font-bold whitespace-nowrap transition-all cursor-pointer ${
            activeTab === 'EMPLOYEE' 
              ? 'border-b-2 border-[#0D47A1] text-[#0D47A1] bg-[#E3F2FD]/30' 
              : 'text-[#78909C] hover:text-[#0D47A1] hover:bg-[#F5F5F5]'
          }`}
        >
          EMPLOYEE PAYMENTS
        </button>
        <button 
          onClick={() => setActiveTab('PROJECT')}
          className={`flex-1 py-2 px-4 text-xs md:text-sm font-bold whitespace-nowrap transition-all cursor-pointer ${
            activeTab === 'PROJECT' 
              ? 'border-b-2 border-[#0D47A1] text-[#0D47A1] bg-[#E3F2FD]/30' 
              : 'text-[#78909C] hover:text-[#0D47A1] hover:bg-[#F5F5F5]'
          }`}
        >
          PROJECT EXPENSES
        </button>
      </div>

      {/* Main Filters */}
      <div className="flex gap-1 md:gap-2 justify-between overflow-x-auto no-scrollbar pb-1">
        {['Daily', 'Monthly', 'Annual', 'Custom'].map(f => (
          <button 
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 md:px-4 py-1 rounded text-[10px] md:text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
              filter === f 
                ? 'bg-[#8BC34A] text-white shadow-md scale-105' 
                : 'bg-[#B0BEC5] text-white hover:bg-[#90A4AE]'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Sub-tabs for Monthly */}
      {filter === 'Monthly' && (
        <div className="flex flex-wrap gap-2 py-3 border-y border-[#B0BEC5]/20 bg-white p-3 rounded-lg shadow-sm">
          <div className="flex-1 min-w-[120px]">
            <label className="text-[10px] font-bold text-[#78909C] block mb-1">SELECT MONTH:</label>
            <select 
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
              className="w-full border border-[#B0BEC5] rounded p-1.5 text-xs bg-white"
            >
              {months.map((m, idx) => (
                <option key={m} value={idx}>{m}</option>
              ))}
            </select>
          </div>
          <div className="flex-1 min-w-[100px]">
            <label className="text-[10px] font-bold text-[#78909C] block mb-1">SELECT YEAR:</label>
            <select 
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              className="w-full border border-[#B0BEC5] rounded p-1.5 text-xs bg-white"
            >
              {years.map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Sub-tabs for Annual */}
      {filter === 'Annual' && (
        <div className="flex gap-2 overflow-x-auto no-scrollbar py-2 border-y border-[#B0BEC5]/20">
          {years.map(y => (
            <button
              key={y}
              onClick={() => setSelectedYear(y)}
              className={`px-3 py-1 rounded-full text-[10px] font-bold whitespace-nowrap transition-all ${selectedYear === y ? 'bg-[#0D47A1] text-white scale-105' : 'bg-white text-[#0D47A1] border border-[#0D47A1]'}`}
            >
              {y}
            </button>
          ))}
        </div>
      )}

      {/* Bulk Actions */}
      {selectedIds.length > 0 && (
        <div className="flex items-center justify-between bg-[#FFEBEE] p-2 rounded-lg border border-[#EF9A9A] animate-in fade-in slide-in-from-top-2">
          <span className="text-xs font-bold text-[#C62828]">{selectedIds.length} items selected</span>
          <button 
            onClick={() => setShowConfirm({ ids: selectedIds })}
            className="bg-[#C62828] text-white px-3 py-1 rounded text-[10px] font-bold flex items-center gap-1 hover:bg-[#B71C1C] hover:scale-105 active:scale-95 transition-all cursor-pointer shadow-sm"
          >
            <Trash2 className="w-3 h-3" /> DELETE SELECTED
          </button>
        </div>
      )}

      {filter === 'Custom' && (
        <div className="flex flex-wrap items-center gap-2 p-3 bg-[#F5F5F5] rounded-lg animate-in fade-in slide-in-from-top-1">
          <span className="bg-[#455A64] text-white text-[10px] px-2 py-1 rounded">Date:</span>
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
              Are you sure you want to delete {showConfirm.ids ? `${showConfirm.ids.length} items` : 'this item'}? This action cannot be undone.
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
            <h3 className="text-lg font-bold text-[#0D47A1] border-b pb-2">Edit Entry</h3>
            <div className="space-y-3">
              {activeTab === 'EMPLOYEE' ? (
                <>
                  <InputField label="NAME:" value={editForm.employeeName} onChange={v => setEditForm({...editForm, employeeName: v})} />
                  <InputField label="PROJECT:" value={editForm.projectName} onChange={v => setEditForm({...editForm, projectName: v})} />
                  <InputField label="PAYMENT:" type="number" value={editForm.payment} onChange={v => setEditForm({...editForm, payment: v})} />
                  <InputField label="TRANSPORT:" type="number" value={editForm.transport} onChange={v => setEditForm({...editForm, transport: v})} />
                </>
              ) : (
                <>
                  <InputField label="PROJECT NAME:" value={editForm.projectName} onChange={v => setEditForm({...editForm, projectName: v})} />
                  <InputField label="MATERIALS COST:" type="number" value={editForm.materialsCost} onChange={v => setEditForm({...editForm, materialsCost: v})} />
                  <InputField label="TRANSPORT:" type="number" value={editForm.transportCost} onChange={v => setEditForm({...editForm, transportCost: v})} />
                  <InputField label="OTHERS:" type="number" value={editForm.othersCost} onChange={v => setEditForm({...editForm, othersCost: v})} />
                </>
              )}
            </div>
            <div className="flex gap-3 pt-4">
              <button 
                onClick={() => { setEditingId(null); setEditForm(null); }}
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
          {activeTab === 'EMPLOYEE' ? (
            <table className="w-full text-[8px] sm:text-[10px] md:text-xs text-left table-fixed">
              <thead className="bg-[#5D9CEC] text-white">
                <tr>
                  {isAdmin && (
                    <th className="p-1 sm:p-2 border-r border-white/20 w-[8%] text-center">
                      <input 
                        type="checkbox" 
                        checked={selectedIds.length > 0 && selectedIds.length === filteredData.length}
                        onChange={() => toggleSelectAll(filteredData.map(d => d.id))}
                        className="w-3 h-3"
                      />
                    </th>
                  )}
                  <th className="p-1 sm:p-2 border-r border-white/20 w-[20%]">Date</th>
                  <th className="p-1 sm:p-2 border-r border-white/20 w-[20%]">Name</th>
                  <th className="p-1 sm:p-2 border-r border-white/20 w-[20%]">Project</th>
                  <th className="p-1 sm:p-2 border-r border-white/20 w-[11%]">Pay</th>
                  <th className="p-1 sm:p-2 border-r border-white/20 w-[11%]">Trn</th>
                  {isAdmin && <th className="p-1 sm:p-2 text-center w-[10%]">Act</th>}
                </tr>
              </thead>
              <tbody>
                {(filteredData as EmployeePayment[]).map((p, i) => (
                  <tr key={p.id} className={i % 2 === 0 ? 'bg-white' : 'bg-[#F5F9FD]'}>
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
                    <td className="p-1 sm:p-2 border-r border-[#B0BEC5]/30 truncate">{p.timestamp.split(',')[0]}</td>
                    <td className="p-1 sm:p-2 border-r border-[#B0BEC5]/30 truncate">{p.employeeName}</td>
                    <td className="p-1 sm:p-2 border-r border-[#B0BEC5]/30 truncate">{p.projectName}</td>
                    <td className="p-1 sm:p-2 border-r border-[#B0BEC5]/30 font-bold truncate">{p.payment.toLocaleString()}</td>
                    <td className="p-1 sm:p-2 border-r border-[#B0BEC5]/30 font-bold truncate">{(p.transport || 0).toLocaleString()}</td>
                    {isAdmin && (
                      <td className="p-1 sm:p-2">
                        <div className="flex justify-center gap-1">
                          <button onClick={() => startEdit(p)} className="p-0.5 text-[#0D47A1] hover:scale-125 transition-transform cursor-pointer">
                            <Edit2 className="w-3 h-3 sm:w-4 h-4" />
                          </button>
                          <button onClick={() => setShowConfirm({ id: p.id })} className="p-0.5 text-[#D32F2F] hover:scale-125 transition-transform cursor-pointer">
                            <Trash2 className="w-3 h-3 sm:w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
                {filteredData.length === 0 && (
                  <tr>
                    <td colSpan={isAdmin ? 7 : 5} className="p-8 text-center text-[#78909C]">No data found</td>
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
                        checked={selectedIds.length > 0 && selectedIds.length === filteredData.length}
                        onChange={() => toggleSelectAll(filteredData.map(d => d.id))}
                        className="w-3 h-3"
                      />
                    </th>
                  )}
                  <th className="p-1 sm:p-2 border-r border-white/20 w-[20%]">Date</th>
                  <th className="p-1 sm:p-2 border-r border-white/20 w-[23%]">Project</th>
                  <th className="p-1 sm:p-2 border-r border-white/20 w-[13%]">Mat.</th>
                  <th className="p-1 sm:p-2 border-r border-white/20 w-[13%]">Trn.</th>
                  <th className="p-1 sm:p-2 border-r border-white/20 w-[13%]">Oth.</th>
                  {isAdmin && <th className="p-1 sm:p-2 text-center w-[10%]">Act</th>}
                </tr>
              </thead>
              <tbody>
                {(filteredData as ProjectExpense[]).map((pe, i) => (
                  <tr key={pe.id} className={i % 2 === 0 ? 'bg-white' : 'bg-[#F5F9FD]'}>
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
                    <td className="p-1 sm:p-2 border-r border-[#B0BEC5]/30 truncate">{pe.timestamp.split(',')[0]}</td>
                    <td className="p-1 sm:p-2 border-r border-[#B0BEC5]/30 truncate">{pe.projectName}</td>
                    <td className="p-1 sm:p-2 border-r border-[#B0BEC5]/30 truncate">{pe.materialsCost.toLocaleString()}</td>
                    <td className="p-1 sm:p-2 border-r border-[#B0BEC5]/30 truncate">{pe.transportCost.toLocaleString()}</td>
                    <td className="p-1 sm:p-2 border-r border-[#B0BEC5]/30 font-bold truncate">{pe.othersCost.toLocaleString()}</td>
                    {isAdmin && (
                      <td className="p-1 sm:p-2">
                        <div className="flex justify-center gap-1">
                          <button onClick={() => startEdit(pe)} className="p-0.5 text-[#0D47A1] hover:scale-125 transition-transform cursor-pointer">
                            <Edit2 className="w-3 h-3 sm:w-4 h-4" />
                          </button>
                          <button onClick={() => setShowConfirm({ id: pe.id })} className="p-0.5 text-[#D32F2F] hover:scale-125 transition-transform cursor-pointer">
                            <Trash2 className="w-3 h-3 sm:w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
                {filteredData.length === 0 && (
                  <tr>
                    <td colSpan={isAdmin ? 6 : 4} className="p-8 text-center text-[#78909C]">No data found</td>
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

function ProjectSummaryView({ payments, projectExpenses }: { 
  payments: EmployeePayment[], 
  projectExpenses: ProjectExpense[]
}) {
  const [search, setSearch] = useState('');

  const projectTotals = useMemo(() => {
    const totals: Record<string, { name: string, materialsCost: number, cost: number, manpowerCost: number }> = {};
    
    // Add employee payments per project
    payments.forEach(p => {
      const key = p.projectName.trim().toLowerCase();
      if (!totals[key]) totals[key] = { name: p.projectName, materialsCost: 0, cost: 0, manpowerCost: 0 };
      const manpower = p.payment + (p.transport || 0);
      totals[key].manpowerCost += manpower;
      totals[key].cost += manpower;
    });
    
    // Add other project expenses
    projectExpenses.forEach(p => {
      const key = p.projectName.trim().toLowerCase();
      if (!totals[key]) totals[key] = { name: p.projectName, materialsCost: 0, cost: 0, manpowerCost: 0 };
      
      const totalMaterialsAndTransport = p.materialsCost + p.transportCost + p.othersCost;
      
      totals[key].materialsCost += totalMaterialsAndTransport;
      totals[key].cost += totalMaterialsAndTransport;
    });

    return Object.values(totals)
      .filter(p => p.name.toLowerCase().includes(search.toLowerCase()));
  }, [payments, projectExpenses, search]);

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold border-b-2 border-[#0D47A1] inline-block pb-1 text-[#FF8F00]">Project Summary</h2>
      
      <div className="relative">
        <input 
          type="text" 
          placeholder="Search" 
          className="w-full border border-[#B0BEC5] rounded-full py-2 px-4 pr-10 shadow-sm"
          value={search}
          onChange={e => setSearch(e.target.value)}
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
                  <th className="p-2 border-r border-white/20 w-10 text-center">SI</th>
                  <th className="p-2 border-r border-white/20">Project Name</th>
                  <th className="p-2 border-r border-white/20">Manpower Cost</th>
                  <th className="p-2 border-r border-white/20">Total Materials</th>
                  <th className="p-2">Total Cost</th>
                </tr>
              </thead>
              <tbody>
                {projectTotals.map((p, i) => (
                  <tr key={p.name} className={i % 2 === 0 ? 'bg-white' : 'bg-[#F5F9FD]'}>
                    <td className="p-2 border-r border-[#B0BEC5]/30 text-center">{(i + 1).toString().padStart(2, '0')}</td>
                    <td className="p-2 border-r border-[#B0BEC5]/30">{p.name}</td>
                    <td className="p-2 border-r border-[#B0BEC5]/30 font-medium">{formatCurrency(p.manpowerCost)}</td>
                    <td className="p-2 border-r border-[#B0BEC5]/30 font-medium">{formatCurrency(p.materialsCost)}</td>
                    <td className="p-2 font-bold text-[#2E7D32]">{formatCurrency(p.cost)}</td>
                  </tr>
                ))}
                {projectTotals.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-[#78909C]">No data found</td>
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
  isAdmin 
}: { 
  projectExpenses: ProjectExpense[], 
  payments: EmployeePayment[], 
  collectedBills: CollectedBill[],
  onUpdateBudget: (name: string, budget: number) => void, 
  onAddCollectedBill: (bill: Omit<CollectedBill, 'id'>) => void,
  onDeleteCollectedBill: (id: string) => void,
  isAdmin: boolean 
}) {
  const [activeTab, setActiveTab] = useState<'SUMMARY' | 'COLLECT_BILL'>('SUMMARY');
  const [search, setSearch] = useState('');
  const [editingBudget, setEditingBudget] = useState<{ name: string, value: string } | null>(null);

  // Collect Bill form state
  const [collectDate, setCollectDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [collectProject, setCollectProject] = useState('');
  const [collectAmount, setCollectAmount] = useState('');

  const projectNames = useMemo(() => {
    const allNames = [
      ...projectExpenses.map(p => p.projectName),
      ...payments.map(p => p.projectName),
      ...collectedBills.map(b => b.projectName)
    ].filter(Boolean);

    return Array.from(
      new Map(
        allNames.map(name => [name.trim().toLowerCase(), name.trim()])
      ).values()
    );
  }, [projectExpenses, payments, collectedBills]);

  const handleCollectBill = async () => {
    if (!collectProject || !collectAmount) return;
    try {
      await onAddCollectedBill({
        date: collectDate,
        projectName: collectProject,
        amount: parseFloat(collectAmount)
      });
      setCollectProject('');
      setCollectAmount('');
      alert('Bill collected successfully!');
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
    const data: Record<string, { name: string, budget: number, cost: number, collected: number }> = {};

    projectExpenses.forEach(pe => {
      const key = pe.projectName.trim().toLowerCase();
      if (!data[key]) data[key] = { name: pe.projectName, budget: 0, cost: 0, collected: 0 };
      if (pe.budget > 0) data[key].budget = pe.budget;
      data[key].cost += (pe.materialsCost + pe.transportCost + pe.othersCost);
    });

    payments.forEach(p => {
      const key = p.projectName.trim().toLowerCase();
      if (!data[key]) data[key] = { name: p.projectName, budget: 0, cost: 0, collected: 0 };
      data[key].cost += (p.payment + (p.transport || 0));
    });

    collectedBills.forEach(cb => {
      const key = cb.projectName.trim().toLowerCase();
      if (!data[key]) data[key] = { name: cb.projectName, budget: 0, cost: 0, collected: 0 };
      data[key].collected += cb.amount;
    });

    return Object.values(data)
      .map(p => ({ 
        ...p, 
        totalBudget: p.budget + p.collected,
        revenue: (p.budget + p.collected) - p.cost 
      }))
      .filter(p => p.name.toLowerCase().includes(search.toLowerCase()));
  }, [projectExpenses, payments, collectedBills, search]);

  return (
    <div className="space-y-6 pb-12">
      <h2 className="text-xl font-bold border-b-2 border-[#0D47A1] inline-block pb-1 text-[#FF8F00]">Total Revenue</h2>
      
      {/* Tabs */}
      <div className="flex border-b border-[#B0BEC5] mb-4">
        <button 
          onClick={() => setActiveTab('SUMMARY')}
          className={`px-4 py-2 text-sm font-bold transition-colors ${
            activeTab === 'SUMMARY' 
              ? 'border-b-2 border-[#0D47A1] text-[#0D47A1] bg-[#E3F2FD]/30' 
              : 'text-[#78909C] hover:text-[#0D47A1] hover:bg-[#F5F5F5]'
          }`}
        >
          Revenue Summary
        </button>
        <button 
          onClick={() => setActiveTab('COLLECT_BILL')}
          className={`px-4 py-2 text-sm font-bold transition-colors ${
            activeTab === 'COLLECT_BILL' 
              ? 'border-b-2 border-[#0D47A1] text-[#0D47A1] bg-[#E3F2FD]/30' 
              : 'text-[#78909C] hover:text-[#0D47A1] hover:bg-[#F5F5F5]'
          }`}
        >
          Collect Bill
        </button>
      </div>

      {activeTab === 'SUMMARY' ? (
        <>
          <div className="relative">
            <input 
              type="text" 
              placeholder="Search" 
              className="w-full border border-[#B0BEC5] rounded-full py-2 px-4 pr-10 shadow-sm"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            <Search className="absolute right-3 top-2.5 w-5 h-5 text-[#B0BEC5]" />
          </div>

          <div className="overflow-hidden rounded-lg border border-[#B0BEC5] bg-white">
            <table className="w-full text-[10px] sm:text-xs text-center">
              <thead className="bg-[#5D9CEC] text-white">
                <tr>
                  <th className="p-2 border-r border-white/20">Project Name</th>
                  <th className="p-2 border-r border-white/20">Project Budget</th>
                  <th className="p-2 border-r border-white/20">Project Cost</th>
                  <th className="p-2">Revenue</th>
                </tr>
              </thead>
              <tbody>
                {revenueData.map((p, i) => (
                  <tr key={p.name} className={i % 2 === 0 ? 'bg-white' : 'bg-[#F5F9FD]'}>
                    <td className="p-2 border-r border-[#B0BEC5]/30">{p.name}</td>
                    <td className="p-2 border-r border-[#B0BEC5]/30 font-bold text-[#0D47A1]">
                      {formatCurrency(p.totalBudget)}
                    </td>
                    <td className="p-2 border-r border-[#B0BEC5]/30">{formatCurrency(p.cost)}</td>
                    <td className={`p-2 font-bold ${p.revenue >= 0 ? 'text-[#2E7D32]' : 'text-[#C62828]'}`}>
                      {formatCurrency(p.revenue)}
                    </td>
                  </tr>
                ))}
                {revenueData.length === 0 && (
                  <tr>
                    <td colSpan={4} className="p-8 text-[#78909C]">No data found</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <div className="space-y-6">
          <div className="bg-white p-4 rounded-xl shadow border border-[#B0BEC5]">
            <h3 className="font-bold text-[#1A237E] mb-4">Add Collected Bill</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-[#455A64] mb-1">Date</label>
                <input 
                  type="date" 
                  className="w-full border border-[#B0BEC5] rounded px-3 py-2 text-sm"
                  value={collectDate}
                  onChange={e => setCollectDate(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#455A64] mb-1">Project Name</label>
                <input 
                  type="text" 
                  placeholder="Enter Project Name"
                  className="w-full border border-[#B0BEC5] rounded px-3 py-2 text-sm"
                  value={collectProject}
                  onChange={e => setCollectProject(e.target.value)}
                  list="collect-project-suggestions"
                />
                <datalist id="collect-project-suggestions">
                  {projectNames.map(name => (
                    <option key={name} value={name} />
                  ))}
                </datalist>
              </div>
              <div>
                <label className="block text-xs font-bold text-[#455A64] mb-1">Amount (Tk)</label>
                <input 
                  type="number" 
                  placeholder="Enter Amount"
                  className="w-full border border-[#B0BEC5] rounded px-3 py-2 text-sm"
                  value={collectAmount}
                  onChange={e => setCollectAmount(e.target.value)}
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
            <h3 className="font-bold text-[#1A237E] p-3 border-b border-[#B0BEC5]/30">Collected Bills History</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-[10px] sm:text-xs text-center">
                <thead className="bg-[#4FC3F7] text-white">
                  <tr>
                    <th className="p-2 border-r border-white/20">Date</th>
                    <th className="p-2 border-r border-white/20">Project Name</th>
                    <th className="p-2">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {collectedBills.map((bill, i) => (
                    <tr key={bill.id} className={i % 2 === 0 ? 'bg-white' : 'bg-[#F5F9FD]'}>
                      <td className="p-2 border-r border-[#B0BEC5]/30 whitespace-nowrap">{bill.date}</td>
                      <td className="p-2 border-r border-[#B0BEC5]/30 font-medium">{bill.projectName}</td>
                      <td className="p-2 font-bold text-[#2E7D32]">
                        {formatCurrency(bill.amount)}
                      </td>
                    </tr>
                  ))}
                  {collectedBills.length === 0 && (
                    <tr>
                      <td colSpan={3} className="p-6 text-[#78909C]">No collected bills yet</td>
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

function EmployeeTotalsView({ payments, onBack }: { payments: EmployeePayment[], onBack: () => void }) {
  const [search, setSearch] = useState('');

  const employeeTotals = useMemo(() => {
    const totals: Record<string, { name: string, payment: number, transport: number, total: number }> = {};
    
    payments.forEach(p => {
      const key = p.employeeName.trim().toLowerCase();
      if (!totals[key]) totals[key] = { name: p.employeeName, payment: 0, transport: 0, total: 0 };
      totals[key].payment += p.payment;
      totals[key].transport += (p.transport || 0);
      totals[key].total += p.payment + (p.transport || 0);
    });

    return Object.values(totals)
      .filter(e => e.name.toLowerCase().includes(search.toLowerCase()))
      .sort((a, b) => b.total - a.total);
  }, [payments, search]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <button onClick={onBack} className="p-1"><ArrowLeft className="w-5 h-5" /></button>
        <h2 className="text-xl font-bold border-b-2 border-[#0D47A1] inline-block pb-1 text-[#FF8F00]">Employee Payment Details</h2>
      </div>
      
      <div className="relative">
        <input 
          type="text" 
          placeholder="Search Employee" 
          className="w-full border border-[#B0BEC5] rounded-full py-2 px-4 pr-10 shadow-sm"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <Search className="absolute right-3 top-2.5 w-5 h-5 text-[#B0BEC5]" />
      </div>

      <div className="overflow-hidden rounded-lg border border-[#B0BEC5] bg-white">
        <table className="w-full text-xs text-left">
          <thead className="bg-[#5D9CEC] text-white">
            <tr>
              <th className="p-2 border-r border-white/20 w-12 text-center">SI</th>
              <th className="p-2 border-r border-white/20">Employee Name</th>
              <th className="p-2 border-r border-white/20">Payment</th>
              <th className="p-2 border-r border-white/20">Transport</th>
              <th className="p-2">Total Amount</th>
            </tr>
          </thead>
          <tbody>
            {employeeTotals.map((e, i) => (
              <tr key={e.name} className={i % 2 === 0 ? 'bg-white' : 'bg-[#F5F9FD]'}>
                <td className="p-2 border-r border-[#B0BEC5]/30 text-center">{(i + 1).toString().padStart(2, '0')}</td>
                <td className="p-2 border-r border-[#B0BEC5]/30">{e.name}</td>
                <td className="p-2 border-r border-[#B0BEC5]/30">{formatCurrency(e.payment)}</td>
                <td className="p-2 border-r border-[#B0BEC5]/30">{formatCurrency(e.transport)}</td>
                <td className="p-2 font-bold">{formatCurrency(e.total)}</td>
              </tr>
            ))}
            {employeeTotals.length === 0 && (
              <tr>
                <td colSpan={5} className="p-8 text-center text-[#78909C]">No employees found</td>
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
  pdfSettings
}: { 
  payments: EmployeePayment[], 
  projectExpenses: ProjectExpense[], 
  bills: Bill[],
  tomorrowWorkData: {[date: string]: TomorrowWorkRow[]},
  nextBillNumber: number,
  nextQuotationNumber: number,
  setPayments: React.Dispatch<React.SetStateAction<EmployeePayment[]>>,
  setProjectExpenses: React.Dispatch<React.SetStateAction<ProjectExpense[]>>,
  setBills: React.Dispatch<React.SetStateAction<Bill[]>>,
  setTomorrowWorkData: React.Dispatch<React.SetStateAction<{[date: string]: TomorrowWorkRow[]}>>,
  setNextBillNumber: React.Dispatch<React.SetStateAction<number>>,
  setNextQuotationNumber: React.Dispatch<React.SetStateAction<number>>,
  onBack: () => void,
  pdfSettings: PDFSettings
}) {
  const [includeEmployee, setIncludeEmployee] = useState(true);
  const [includeMaterials, setIncludeMaterials] = useState(true);
  const [includeEmployeeTotals, setIncludeEmployeeTotals] = useState(true);

  const generatePDF = async () => {
    const doc = new jsPDF();
    let currentY = 35;

    const hexToRgb = (hex: string) => {
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      return result ? [
        parseInt(result[1], 16),
        parseInt(result[2], 16),
        parseInt(result[3], 16)
      ] : [0, 0, 0];
    };

    const headerTextRgb = hexToRgb(pdfSettings.headerTextColor);
    const headerBgRgb = hexToRgb(pdfSettings.headerBgColor);

    // Header Background
    if (pdfSettings.headerBgColor.toUpperCase() !== '#FFFFFF') {
      doc.setFillColor(headerBgRgb[0], headerBgRgb[1], headerBgRgb[2]);
      doc.rect(0, 0, 210, 35, 'F');
    }

    doc.setFontSize(28);
    doc.setTextColor(headerTextRgb[0], headerTextRgb[1], headerTextRgb[2]);
    doc.setFont(pdfSettings.fontStyle, 'bold');
    
    if (pdfSettings.logo) {
      const isWideLogo = pdfSettings.hideNameText;
      // Adjusted for 3000x250 (12:1) aspect ratio
      const logoWidth = isWideLogo ? 160 : 40;
      const logoHeight = isWideLogo ? 13.33 : 13.33;
      const logoX = isWideLogo ? (210 - logoWidth) / 2 : 20;
      const logoY = isWideLogo ? 10 : 10;
      doc.addImage(pdfSettings.logo, 'PNG', logoX, logoY, logoWidth, logoHeight);
    }

    if (!pdfSettings.hideNameText) {
      const nameX = pdfSettings.logo ? 60 : 105;
      const textAlign = pdfSettings.logo ? 'left' : 'center';
      doc.text(pdfSettings.companyName, nameX, 22, { align: textAlign });
    }

    currentY = 45; // Adjust start Y after header
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.setFont(pdfSettings.fontStyle, 'normal');
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 105, currentY, { align: 'center' });
    currentY += 15;

    if (includeEmployee) {
      doc.setFontSize(14);
      doc.setTextColor(0);
      doc.text('Employee Payments', 14, currentY);
      currentY += 5;

      const totalEmployeePayment = payments.reduce((sum, p) => sum + p.payment, 0);

      autoTable(doc, {
        startY: currentY,
        head: [['Date', 'ID', 'Employee Name', 'Project', 'Amount']],
        body: [
          ...payments.map(p => [
            p.timestamp,
            p.uniqueId,
            p.employeeName,
            p.projectName,
            `Tk. ${p.payment.toLocaleString()}`
          ]),
          [{ content: 'TOTAL', colSpan: 4, styles: { halign: 'right', fontStyle: 'bold' } }, { content: `Tk. ${totalEmployeePayment.toLocaleString()}`, styles: { fontStyle: 'bold' } }]
        ],
        theme: 'striped',
        headStyles: { fillColor: [93, 156, 236] },
        footStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold' },
        styles: { textColor: [40, 40, 40] }
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
      doc.text('Employee Payment Details (Totals)', 14, currentY);
      currentY += 5;

      const totals: Record<string, { name: string, payment: number, transport: number, total: number }> = {};
      payments.forEach(p => {
        const key = p.employeeName.trim().toLowerCase();
        if (!totals[key]) totals[key] = { name: p.employeeName, payment: 0, transport: 0, total: 0 };
        totals[key].payment += p.payment;
        totals[key].transport += (p.transport || 0);
        totals[key].total += p.payment + (p.transport || 0);
      });

      const employeeTotals = Object.values(totals).sort((a, b) => b.total - a.total);

      autoTable(doc, {
        startY: currentY,
        head: [['SI', 'Employee Name', 'Payment', 'Transport', 'Total Amount']],
        body: [
          ...employeeTotals.map((e, i) => [
            (i + 1).toString().padStart(2, '0'),
            e.name,
            `Tk. ${e.payment.toLocaleString()}`,
            `Tk. ${e.transport.toLocaleString()}`,
            `Tk. ${e.total.toLocaleString()}`
          ])
        ],
        theme: 'striped',
        headStyles: { fillColor: [77, 182, 172] },
        styles: { textColor: [40, 40, 40] }
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
      doc.text('Project Expenses (Materials/Transport)', 14, currentY);
      currentY += 5;

      const totalMaterials = projectExpenses.reduce((sum, p) => sum + p.materialsCost, 0);
      const totalTransport = projectExpenses.reduce((sum, p) => sum + p.transportCost, 0);
      const totalOthers = projectExpenses.reduce((sum, p) => sum + p.othersCost, 0);
      const grandTotal = totalMaterials + totalTransport + totalOthers;

      autoTable(doc, {
        startY: currentY,
        head: [['Date', 'ID', 'Project', 'Materials', 'Transport', 'Others']],
        body: [
          ...projectExpenses.map(p => [
            p.timestamp,
            p.uniqueId,
            p.projectName,
            `Tk. ${p.materialsCost.toLocaleString()}`,
            `Tk. ${p.transportCost.toLocaleString()}`,
            `Tk. ${p.othersCost.toLocaleString()}`
          ]),
          [
            { content: 'TOTAL', colSpan: 3, styles: { halign: 'right', fontStyle: 'bold' } },
            { content: `Tk. ${totalMaterials.toLocaleString()}`, styles: { fontStyle: 'bold' } },
            { content: `Tk. ${totalTransport.toLocaleString()}`, styles: { fontStyle: 'bold' } },
            { content: `Tk. ${totalOthers.toLocaleString()}`, styles: { fontStyle: 'bold' } }
          ],
          [
            { content: 'GRAND TOTAL', colSpan: 3, styles: { halign: 'right', fontStyle: 'bold' } },
            { content: `Tk. ${grandTotal.toLocaleString()}`, colSpan: 3, styles: { halign: 'center', fontStyle: 'bold', fillColor: [255, 243, 224] } }
          ]
        ],
        theme: 'striped',
        headStyles: { fillColor: [79, 195, 247] },
        styles: { textColor: [40, 40, 40] }
      });
    }

    addFooterToPDF(doc);
    
    // Handle PDF for Android/Capacitor
    const fileName = `expense_report_${new Date().getTime()}.pdf`;
    try {
      // Check if we are in a Capacitor environment
      const isCapacitor = (window as any).Capacitor?.isNativePlatform();
      
      if (isCapacitor) {
        const pdfBase64 = doc.output('datauristring').split(',')[1];
        const result = await Filesystem.writeFile({
          path: fileName,
          data: pdfBase64,
          directory: Directory.Cache, // Use Cache for temporary files
        });
        
        await Share.share({
          title: 'Expense Report',
          text: 'Here is your expense report',
          url: result.uri,
          dialogTitle: 'Share PDF',
        });
      } else {
        doc.save(fileName);
      }
    } catch (e) {
      console.error('PDF Generation Error:', e);
      doc.save(fileName);
    }
  };

    const addFooterToPDF = (doc: jsPDF) => {
      const pageCount = (doc as any).internal.getNumberOfPages();
      const hexToRgb = (hex: string) => {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? [
          parseInt(result[1], 16),
          parseInt(result[2], 16),
          parseInt(result[3], 16)
        ] : [0, 0, 0];
      };
      const footerTextRgb = hexToRgb(pdfSettings.footerTextColor);
      const footerBgRgb = hexToRgb(pdfSettings.footerBgColor);

      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        
        if (pdfSettings.footerBgColor.toUpperCase() !== '#FFFFFF') {
          doc.setFillColor(footerBgRgb[0], footerBgRgb[1], footerBgRgb[2]);
          doc.rect(0, 280, 210, 17, 'F');
        }

        doc.setFontSize(8);
        doc.setTextColor(footerTextRgb[0], footerTextRgb[1], footerTextRgb[2]);
        doc.setFont(pdfSettings.fontStyle, 'normal');
        doc.text(`Address: ${pdfSettings.address} Email: ${pdfSettings.email}`, 105, 287, { align: 'center' });
        doc.text(`Contact: ${pdfSettings.contact}`, 105, 292, { align: 'center' });
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
      version: "1.1"
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
          encoding: Encoding.UTF8
        });
        
        await Share.share({
          title: 'Data Backup',
          text: 'Your payment tracker data backup',
          url: result.uri,
          dialogTitle: 'Save Backup File',
        });
      } else {
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }
    } catch (e) {
      console.error('Backup Error:', e);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
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
          if (window.confirm("Are you sure you want to restore this backup? This will overwrite your current data.")) {
            setPayments(data.payments);
            setProjectExpenses(data.projectExpenses);
            
            if (data.bills) {
              setBills(data.bills);
              localStorage.setItem('bills', JSON.stringify(data.bills));
            }
            if (data.tomorrowWorkData) {
              setTomorrowWorkData(data.tomorrowWorkData);
              localStorage.setItem('tomorrowWorkData', JSON.stringify(data.tomorrowWorkData));
            }
            if (data.nextBillNumber) {
              setNextBillNumber(data.nextBillNumber);
              localStorage.setItem('nextBillNumber', data.nextBillNumber.toString());
            }
            if (data.nextQuotationNumber) {
              setNextQuotationNumber(data.nextQuotationNumber);
              localStorage.setItem('nextQuotationNumber', data.nextQuotationNumber.toString());
            }

            localStorage.setItem('payments', JSON.stringify(data.payments));
            localStorage.setItem('projectExpenses', JSON.stringify(data.projectExpenses));
            
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
    event.target.value = '';
  };

  const exportToCSV = async () => {
    let csvContent = "Date,ID,Category,Name,Project,Amount,Transport,Total\n";
    
    if (includeEmployee) {
      payments.forEach(p => {
        csvContent += `${p.timestamp},${p.uniqueId},Employee Payment,"${p.employeeName}","${p.projectName}",${p.payment},${p.transport || 0},${p.payment + (p.transport || 0)}\n`;
      });
    }

    if (includeEmployeeTotals) {
      csvContent += "\nEmployee Totals\n";
      csvContent += "Name,Payment,Transport,Total\n";
      const totals: Record<string, { name: string, payment: number, transport: number, total: number }> = {};
      payments.forEach(p => {
        const key = p.employeeName.trim().toLowerCase();
        if (!totals[key]) totals[key] = { name: p.employeeName, payment: 0, transport: 0, total: 0 };
        totals[key].payment += p.payment;
        totals[key].transport += (p.transport || 0);
        totals[key].total += p.payment + (p.transport || 0);
      });
      Object.values(totals).forEach(e => {
        csvContent += `"${e.name}",${e.payment},${e.transport},${e.total}\n`;
      });
    }
    
    if (includeMaterials) {
      csvContent += "\nMaterials Cost\n";
      projectExpenses.forEach(p => {
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
          encoding: Encoding.UTF8
        });
        
        await Share.share({
          title: 'Excel Data',
          text: 'Your expense data in CSV format',
          url: result.uri,
          dialogTitle: 'Save CSV File',
        });
      } else {
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }
    } catch (e) {
      console.error('CSV Export Error:', e);
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
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
        <button onClick={onBack} className="p-1"><ArrowLeft className="w-5 h-5" /></button>
        <h2 className="text-xl font-bold border-b-2 border-[#0D47A1] inline-block pb-1 text-[#FF8F00]">Backup & Export</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* PDF Export Section */}
        <div className="bg-white p-6 rounded-xl shadow-md border border-[#B0BEC5] flex flex-col">
          <div className="flex items-center gap-2 text-[#1A237E] mb-4">
            <Download className="w-5 h-5" />
            <h3 className="font-bold">PDF Report</h3>
          </div>
          
          <p className="text-xs text-[#455A64] mb-4 flex-grow">
            এটি একটি ডকুমেন্ট ফাইল। এটি আপনি সরাসরি প্রিন্ট করতে পারবেন বা গুগল ড্রাইভে সেভ করে যে কাউকে পাঠাতে পারবেন।
          </p>
          
          <div className="space-y-3 mb-6">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={includeEmployee} onChange={(e) => setIncludeEmployee(e.target.checked)} className="accent-[#0D47A1]" />
              Employee Cost
            </label>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={includeEmployeeTotals} onChange={(e) => setIncludeEmployeeTotals(e.target.checked)} className="accent-[#0D47A1]" />
              Employee Payment Details
            </label>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={includeMaterials} onChange={(e) => setIncludeMaterials(e.target.checked)} className="accent-[#0D47A1]" />
              Materials Cost
            </label>
          </div>

          <button 
            onClick={generatePDF}
            disabled={!includeEmployee && !includeMaterials && !includeEmployeeTotals}
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
            এটি এক্সেল ফাইল। এটি গুগল ড্রাইভে সেভ করলে আপনি **Google Sheets** দিয়ে ওপেন করে সব হিসাব দেখতে ও এডিট করতে পারবেন।
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
            এটি শুধুমাত্র অ্যাপের জন্য। এটি সরাসরি ওপেন করা যায় না। এটি দিয়ে আপনি ডাটা রিস্টোর (Restore) করতে পারবেন।
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
              <input type="file" accept=".json" onChange={handleLocalRestore} className="hidden" id="restore-file" />
              <label htmlFor="restore-file" className="w-full bg-white text-[#455A64] border-2 border-[#455A64] py-3 rounded-lg font-bold hover:bg-[#F5F5F5] transition-colors flex items-center justify-center gap-2 cursor-pointer">
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

function AboutView({ onBack, onContactClick }: { onBack: () => void, onContactClick: () => void }) {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <button 
          onClick={onBack} 
          className="p-1 hover:bg-[#F5F5F5] rounded-full transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h2 className="text-xl font-bold border-b-2 border-[#0D47A1] inline-block pb-1 text-[#FF8F00]">About Me</h2>
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
                (e.target as HTMLImageElement).style.display = 'none';
                const parent = (e.target as HTMLElement).parentElement;
                if (parent) {
                  const icon = parent.querySelector('.user-icon');
                  if (icon) (icon as HTMLElement).style.display = 'flex';
                }
              }}
              onLoad={(e) => {
                // If photo loads, hide the icon
                const parent = (e.target as HTMLElement).parentElement;
                if (parent) {
                  const icon = parent.querySelector('.user-icon');
                  if (icon) (icon as HTMLElement).style.display = 'none';
                }
              }}
            />
            <div className="user-icon hidden items-center justify-center w-full h-full">
              <User className="w-16 h-16 text-[#0D47A1]" />
            </div>
          </div>
        </div>
        
        <div className="space-y-2">
          <h3 className="text-2xl font-bold text-[#1A237E]">Bijoy Mahmud Munna</h3>
          <div className="flex justify-center">
            <span className="px-4 py-1 bg-[#E3F2FD] text-[#0D47A1] text-xs font-bold rounded-full border border-[#0D47A1]/20 shadow-sm">
              Lead Developer
            </span>
          </div>
        </div>

        <div className="h-px bg-[#B0BEC5]/30 w-full" />

        <p className="text-sm text-[#455A64] leading-relaxed max-w-lg mx-auto text-justify">
          I am <span className="font-bold text-[#1A237E]">Bijoy Mahmud Munna</span>, the <span className="text-[#0D47A1] font-semibold">Lead Developer</span> at <span className="font-bold text-[#0D47A1]">Mavxon</span>. 
          I specialize in crafting high-quality software solutions for various companies, helping them optimize their workflows through innovative digital tools. 
          This <span className="font-bold text-[#FF8F00]">Project Tracker</span> is a testament to that commitment—engineered to provide seamless oversight of employee payments, 
          material logistics, and project budgets. My goal is to empower businesses with data-driven precision and technical excellence.
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
  isAdmin
}: { 
  rows: TomorrowWorkRow[], 
  setRows: React.Dispatch<React.SetStateAction<TomorrowWorkRow[]>>, 
  manpowerSuggestions: string[],
  setManpowerSuggestions: React.Dispatch<React.SetStateAction<string[]>>,
  projectSuggestions: string[],
  setProjectSuggestions: React.Dispatch<React.SetStateAction<string[]>>,
  addressSuggestions: string[],
  setAddressSuggestions: React.Dispatch<React.SetStateAction<string[]>>,
  workSuggestions: string[],
  setWorkSuggestions: React.Dispatch<React.SetStateAction<string[]>>,
  date: string,
  setDate: (date: string) => void,
  onBack: () => void,
  onViewHistory: () => void,
  onSave: () => void,
  isAdmin: boolean
}) {
  const [activeRowId, setActiveRowId] = useState<string | null>(null);
  const [activeField, setActiveField] = useState<'projectName' | 'projectAddress' | 'workDescription' | 'manpower' | null>(null);
  const [manpowerInput, setManpowerInput] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);

  const updateRow = (id: string, field: keyof TomorrowWorkRow, value: any) => {
    setRows(rows.map(row => row.id === id ? { ...row, [field]: value } : row));
  };

  const addRow = () => {
    setRows([...rows, {
      id: crypto.randomUUID(),
      projectName: '',
      projectAddress: '',
      workDescription: '',
      manpowerList: [],
      overtime: ''
    }]);
  };

  const addManpower = (rowId: string, name: string) => {
    if (!name.trim()) return;
    const trimmedName = name.trim();
    
    setRows(rows.map(row => {
      if (row.id === rowId) {
        // Case-insensitive duplicate check
        const exists = row.manpowerList.some(m => m.toLowerCase() === trimmedName.toLowerCase());
        if (exists) return row;
        return { ...row, manpowerList: [...row.manpowerList, trimmedName] };
      }
      return row;
    }));

    if (!manpowerSuggestions.some(s => s.toLowerCase() === trimmedName.toLowerCase())) {
      setManpowerSuggestions(prev => [...prev, trimmedName]);
    }
    
    setManpowerInput('');
    setShowSuggestions(false);
  };

  const removeManpower = (rowId: string, index: number) => {
    setRows(rows.map(row => {
      if (row.id === rowId) {
        const newList = [...row.manpowerList];
        newList.splice(index, 1);
        return { ...row, manpowerList: newList };
      }
      return row;
    }));
  };

  const removeRow = (id: string) => {
    if (rows.length > 1) {
      setRows(rows.filter(row => row.id !== id));
    }
  };

  const clearAllRows = () => {
    setRows([{
      id: crypto.randomUUID(),
      projectName: '',
      projectAddress: '',
      workDescription: '',
      manpowerList: [],
      overtime: ''
    }]);
    // Reset to today's date in local time (YYYY-MM-DD)
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    setDate(`${year}-${month}-${day}`);
  };

  const filteredManpowerSuggestions = manpowerSuggestions.filter(s => 
    s.toLowerCase().includes(manpowerInput.toLowerCase()) && 
    !rows.find(r => r.id === activeRowId)?.manpowerList.some(m => m.toLowerCase() === s.toLowerCase())
  );

  return (
    <div className="space-y-2 pb-64">
      <div className="flex items-center justify-between gap-3 mb-1">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-bold border-b-2 border-[#ED7D31] inline-block pb-1 text-[#ED7D31]">Tomorrow Work</h2>
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
          <button 
            onClick={addRow}
            className="px-3 py-1 text-xs font-bold text-white bg-[#0D47A1] rounded shadow-sm hover:bg-[#1565C0] transition-colors flex items-center gap-1"
          >
            <Plus className="w-3 h-3" /> Add Row
          </button>
        </div>
      </div>

      {/* Date Field Row - Highlighted but no container border */}
      <div className="bg-[#E3F2FD] p-1.5 rounded-lg flex items-center justify-start gap-3">
        <label className="text-[10px] font-black text-[#0D47A1] uppercase tracking-wider">Work Date:</label>
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
        <table className="w-full text-left border-collapse table-fixed">
          <thead>
            <tr className="bg-[#F5F9FD] border-b border-[#B0BEC5]/30 text-[8px] font-bold text-[#455A64] uppercase tracking-wider">
              <th className="p-1 border-r border-[#B0BEC5]/30 w-[8%] text-center">SL</th>
              <th className="p-1 border-r border-[#B0BEC5]/30 w-[17%] text-center">Project</th>
              <th className="p-1 border-r border-[#B0BEC5]/30 w-[17%] text-center">Address</th>
              <th className="p-1 border-r border-[#B0BEC5]/30 w-[18%] text-center">Work</th>
              <th className="p-1 border-r border-[#B0BEC5]/30 w-[30%] text-center">Manpower</th>
              <th className="p-1 w-[10%] text-center">OT</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={row.id} className="border-b border-[#B0BEC5]/20 hover:bg-[#F5F9FD]/50 transition-colors">
                <td className="p-0.5 border-r border-[#B0BEC5]/20 text-center">
                  <div className="flex flex-col items-center gap-0.5">
                    <span className="text-[9px] font-bold text-[#78909C]">{index + 1}</span>
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
                      updateRow(row.id, 'projectName', e.target.value);
                      setActiveRowId(row.id);
                      setActiveField('projectName');
                      setShowSuggestions(true);
                    }}
                    onFocus={() => {
                      setActiveRowId(row.id);
                      setActiveField('projectName');
                      setShowSuggestions(true);
                    }}
                    onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                    className="w-full p-0.5 text-[9px] border-none focus:ring-1 focus:ring-[#0D47A1] rounded bg-transparent resize-none min-h-[35px] leading-tight"
                    placeholder="Proj..."
                  />
                  {showSuggestions && activeRowId === row.id && activeField === 'projectName' && (
                    <div className="absolute left-0 right-0 top-full z-50 bg-white border border-[#B0BEC5]/30 shadow-lg rounded-md max-h-32 overflow-y-auto">
                      {projectSuggestions.filter(s => s.toLowerCase().includes(row.projectName.toLowerCase())).map((s, i) => (
                        <button
                          key={i}
                          onClick={() => {
                            updateRow(row.id, 'projectName', s);
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
                      updateRow(row.id, 'projectAddress', e.target.value);
                      setActiveRowId(row.id);
                      setActiveField('projectAddress');
                      setShowSuggestions(true);
                    }}
                    onFocus={() => {
                      setActiveRowId(row.id);
                      setActiveField('projectAddress');
                      setShowSuggestions(true);
                    }}
                    onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                    className="w-full p-0.5 text-[9px] border-none focus:ring-1 focus:ring-[#0D47A1] rounded bg-transparent resize-none min-h-[35px] leading-tight"
                    placeholder="Addr..."
                  />
                  {showSuggestions && activeRowId === row.id && activeField === 'projectAddress' && (
                    <div className="absolute left-0 right-0 top-full z-50 bg-white border border-[#B0BEC5]/30 shadow-lg rounded-md max-h-32 overflow-y-auto">
                      {addressSuggestions.filter(s => s.toLowerCase().includes(row.projectAddress.toLowerCase())).map((s, i) => (
                        <button
                          key={i}
                          onClick={() => {
                            updateRow(row.id, 'projectAddress', s);
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
                      updateRow(row.id, 'workDescription', e.target.value);
                      setActiveRowId(row.id);
                      setActiveField('workDescription');
                      setShowSuggestions(true);
                    }}
                    onFocus={() => {
                      setActiveRowId(row.id);
                      setActiveField('workDescription');
                      setShowSuggestions(true);
                    }}
                    onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                    className="w-full p-0.5 text-[9px] border-none focus:ring-1 focus:ring-[#0D47A1] rounded bg-transparent resize-none min-h-[35px] leading-tight"
                    placeholder="Work..."
                  />
                  {showSuggestions && activeRowId === row.id && activeField === 'workDescription' && (
                    <div className="absolute left-0 right-0 top-full z-50 bg-white border border-[#B0BEC5]/30 shadow-lg rounded-md max-h-32 overflow-y-auto">
                      {workSuggestions.filter(s => s.toLowerCase().includes(row.workDescription.toLowerCase())).map((s, i) => (
                        <button
                          key={i}
                          onClick={() => {
                            updateRow(row.id, 'workDescription', s);
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
                    <div className="flex flex-wrap gap-0.5">
                      {row.manpowerList.map((name, mIndex) => (
                        <div key={mIndex} className="flex items-center gap-0.5 bg-[#E3F2FD] text-[#0D47A1] px-1 py-0.5 rounded-full text-[8px] font-bold whitespace-nowrap overflow-hidden text-ellipsis max-w-full">
                          <span>{mIndex + 1}.{name}</span>
                          <button onClick={() => removeManpower(row.id, mIndex)} className="hover:text-red-600 shrink-0">
                            <X className="w-2 h-2" />
                          </button>
                        </div>
                      ))}
                    </div>
                    <div className="relative">
                      <div className="flex gap-0.5">
                        <input 
                          type="text"
                          value={activeRowId === row.id && activeField === 'manpower' ? manpowerInput : ''}
                          onChange={(e) => {
                            setActiveRowId(row.id);
                            setActiveField('manpower');
                            setManpowerInput(e.target.value);
                            setShowSuggestions(true);
                          }}
                          onFocus={() => {
                            setActiveRowId(row.id);
                            setActiveField('manpower');
                            setShowSuggestions(true);
                          }}
                          onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
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
                      {activeRowId === row.id && showSuggestions && activeField === 'manpower' && (manpowerInput || manpowerSuggestions.length > 0) && (
                        <div className="absolute z-50 left-0 right-0 mt-1 bg-white border border-[#B0BEC5] rounded shadow-2xl max-h-80 overflow-y-auto ring-1 ring-black ring-opacity-5">
                          {(manpowerInput ? filteredManpowerSuggestions : manpowerSuggestions.filter(s => !row.manpowerList.some(m => m.toLowerCase() === s.toLowerCase()))).map((suggestion, sIndex) => (
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
                    onChange={(e) => updateRow(row.id, 'overtime', e.target.value)}
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
  isAdmin
}: { 
  data: {[date: string]: TomorrowWorkRow[]}, 
  onBack: () => void,
  onSelectDate: (date: string) => void,
  onDeleteDate: (date: string) => void,
  isAdmin: boolean
}) {
  const dates = Object.keys(data).sort((a, b) => b.localeCompare(a));

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <button onClick={onBack} className="p-1 hover:bg-[#F5F5F5] rounded-full transition-colors cursor-pointer">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h2 className="text-xl font-bold border-b-2 border-[#ED7D31] inline-block pb-1 text-[#ED7D31]">Work History</h2>
      </div>

      <div className="grid grid-cols-1 gap-3">
        {dates.map(date => (
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
                  <p className="text-[10px] text-[#78909C] font-medium">{data[date].length} Projects recorded</p>
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
            <p className="text-[10px] text-[#90A4AE] mt-1">Recorded work will appear here</p>
          </div>
        )}
      </div>
    </div>
  );
}

function TomorrowWorkDetailsView({ 
  rows, 
  date, 
  onBack 
}: { 
  rows: TomorrowWorkRow[], 
  date: string, 
  onBack: () => void 
}) {
  return (
    <div className="fixed inset-0 bg-white z-50 flex flex-col overflow-hidden">
      <div className="p-4 border-b border-[#B0BEC5]/30 flex items-center gap-3 bg-white sticky top-0 z-10">
        <button onClick={onBack} className="p-2 hover:bg-[#F5F5F5] rounded-full transition-colors cursor-pointer">
          <ArrowLeft className="w-6 h-6 text-[#1A237E]" />
        </button>
        <h2 className="text-xl font-bold text-[#1A237E]">Work Date - {date}</h2>
      </div>

      <div className="flex-1 overflow-auto p-2">
        <div className="bg-white rounded-xl shadow-md border border-[#B0BEC5]/30 overflow-hidden">
          <table className="w-full text-left border-collapse table-fixed">
            <thead>
              <tr className="bg-[#F5F9FD] border-b border-[#B0BEC5]/30 text-[10px] font-bold text-[#455A64] uppercase tracking-wider">
                <th className="p-2 border-r border-[#B0BEC5]/30 w-[6%] text-center">SL</th>
                <th className="p-2 border-r border-[#B0BEC5]/30 w-[18%]">Project</th>
                <th className="p-2 border-r border-[#B0BEC5]/30 w-[18%]">Address</th>
                <th className="p-2 border-r border-[#B0BEC5]/30 w-[20%]">Work Description</th>
                <th className="p-2 border-r border-[#B0BEC5]/30 w-[30%]">Manpower</th>
                <th className="p-2 w-[8%] text-center">OT</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr key={row.id} className="border-b border-[#B0BEC5]/20 hover:bg-[#F5F9FD]/30 transition-colors">
                  <td className="p-2 border-r border-[#B0BEC5]/20 text-center text-[11px] font-bold text-[#78909C]">
                    {index + 1}
                  </td>
                  <td className="p-2 border-r border-[#B0BEC5]/20 text-[11px] font-medium text-[#1A237E] break-words">
                    {row.projectName || 'N/A'}
                  </td>
                  <td className="p-2 border-r border-[#B0BEC5]/20 text-[11px] font-medium text-[#455A64] break-words">
                    {row.projectAddress || 'N/A'}
                  </td>
                  <td className="p-2 border-r border-[#B0BEC5]/20 text-[11px] font-medium text-[#455A64] break-words whitespace-pre-wrap">
                    {row.workDescription || 'N/A'}
                  </td>
                  <td className="p-2 border-r border-[#B0BEC5]/20">
                    <div className="flex flex-wrap gap-1">
                      {row.manpowerList.length > 0 ? (
                        row.manpowerList.map((name, mIndex) => (
                          <span key={mIndex} className="bg-[#E3F2FD] text-[#0D47A1] px-1.5 py-0.5 rounded-full text-[9px] font-bold whitespace-nowrap">
                            {mIndex + 1}. {name}
                          </span>
                        ))
                      ) : (
                        <span className="text-[9px] text-[#90A4AE] italic">None</span>
                      )}
                    </div>
                  </td>
                  <td className="p-2 text-center text-[11px] font-bold text-[#2E7D32]">
                    {row.overtime || '-'}
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
      label: 'Phone',
      value: '+880 1682799198',
      href: 'tel:+8801682799198',
      cta: 'Call Now',
      color: 'text-green-600',
      bg: 'bg-green-50'
    },
    {
      icon: <Mail className="w-5 h-5" />,
      label: 'Email',
      value: 'Bijoy.mm112@gmail.com',
      href: 'mailto:Bijoy.mm112@gmail.com',
      cta: 'Send Mail',
      color: 'text-red-600',
      bg: 'bg-red-50'
    },
    {
      icon: <Globe className="w-5 h-5" />,
      label: 'Website',
      value: 'www.al-tasmim.net',
      href: 'https://www.al-tasmim.net',
      cta: 'Visit',
      color: 'text-blue-600',
      bg: 'bg-blue-50'
    },
    {
      icon: <Facebook className="w-5 h-5" />,
      label: 'Facebook',
      value: 'facebook.com/munna.abir.3',
      href: 'https://facebook.com/munna.abir.3',
      cta: 'Visit',
      color: 'text-blue-800',
      bg: 'bg-blue-100'
    },
    {
      icon: <Linkedin className="w-5 h-5" />,
      label: 'LinkedIn',
      value: 'linkedin.com/in/bijoy-mahumud-munna-2561181b8',
      href: 'https://www.linkedin.com/in/bijoy-mahumud-munna-2561181b8',
      cta: 'Connect',
      color: 'text-blue-700',
      bg: 'bg-blue-50'
    },
    {
      icon: <Github className="w-5 h-5" />,
      label: 'GitHub',
      value: 'github.com/bijoymm',
      href: 'https://github.com/bijoymm',
      cta: 'Follow',
      color: 'text-gray-900',
      bg: 'bg-gray-100'
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
          <ArrowLeft className="w-6 h-6 text-[#1A237E]" />
        </button>
        <h2 className="text-xl font-bold border-b-2 border-[#0D47A1] inline-block pb-1">Contact Info</h2>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {contactLinks.map((link, index) => (
          <motion.a
            key={index}
            href={link.href}
            target={link.href.startsWith('http') ? '_blank' : undefined}
            rel={link.href.startsWith('http') ? 'noopener noreferrer' : undefined}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className="flex items-center gap-4 p-4 bg-white rounded-xl border border-[#B0BEC5]/30 shadow-sm hover:shadow-md hover:border-[#0D47A1]/50 transition-all active:scale-95 group relative overflow-hidden"
          >
            <div className={`w-12 h-12 ${link.bg} ${link.color} rounded-lg flex items-center justify-center group-hover:scale-110 group-hover:rotate-3 transition-all duration-300`}>
              {link.icon}
            </div>
            <div className="flex-1">
              <p className="text-[10px] font-bold text-[#78909C] uppercase tracking-wider">{link.label}</p>
              <p className="text-sm font-bold text-[#1A237E] truncate pr-16">{link.value}</p>
            </div>
            
            {/* CTA Badge - Visible on Hover */}
            <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-4 group-hover:translate-x-0">
              <span className={`px-3 py-1 rounded-full text-[10px] font-bold ${link.bg} ${link.color} border border-current`}>
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

function CloudSyncView({ payments, projectExpenses, onBack }: { payments: EmployeePayment[], projectExpenses: ProjectExpense[], onBack: () => void }) {
  const [status, setStatus] = useState<'IDLE' | 'SYNCING' | 'SUCCESS' | 'ERROR'>('IDLE');
  const [error, setError] = useState<string | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);

  // Note: In a real app, this should be an environment variable
  const CLIENT_ID = "620015569150-quo3hekn9b0jqiebdivibanvm4gentqj.apps.googleusercontent.com";

  const handleConnect = () => {
    if (window.hasOwnProperty('Capacitor')) {
      setError("Google Drive Sync is currently only supported in the web browser version. For Android, please use the 'Local Backup' option in the Export menu.");
      setStatus('ERROR');
      return;
    }

    if (!(window as any).google) {
      setError("Google SDK not loaded. Please check your internet connection.");
      setStatus('ERROR');
      return;
    }

    const client = (window as any).google.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope: 'https://www.googleapis.com/auth/drive.file',
      callback: (response: any) => {
        if (response.error) {
          setError(response.error_description || "Authentication failed");
          setStatus('ERROR');
        } else {
          setAccessToken(response.access_token);
          setStatus('IDLE');
        }
      },
    });
    client.requestAccessToken();
  };

  const syncToDrive = async () => {
    if (!accessToken) return;
    setStatus('SYNCING');
    setError(null);

    try {
      const data = {
        payments,
        projectExpenses,
        lastSync: new Date().toISOString()
      };

      // 1. Search for existing file
      const searchResponse = await fetch(
        `https://www.googleapis.com/drive/v3/files?q=name='tracker_data.json' and trashed=false`,
        {
          headers: { Authorization: `Bearer ${accessToken}` }
        }
      );
      const searchResult = await searchResponse.json();
      const existingFile = searchResult.files && searchResult.files[0];

      let response;
      if (existingFile) {
        // 2. Update existing file
        response = await fetch(
          `https://www.googleapis.com/upload/drive/v3/files/${existingFile.id}?uploadType=media`,
          {
            method: 'PATCH',
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
          }
        );
      } else {
        // 3. Create new file
        const metadata = {
          name: 'tracker_data.json',
          mimeType: 'application/json'
        };
        const form = new FormData();
        form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
        form.append('file', new Blob([JSON.stringify(data)], { type: 'application/json' }));

        response = await fetch(
          'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',
          {
            method: 'POST',
            headers: { Authorization: `Bearer ${accessToken}` },
            body: form
          }
        );
      }

      if (response.ok) {
        setStatus('SUCCESS');
      } else {
        const errData = await response.json();
        throw new Error(errData.error?.message || "Sync failed");
      }
    } catch (err: any) {
      setError(err.message);
      setStatus('ERROR');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <button 
          onClick={onBack} 
          className="p-1 hover:bg-[#F5F5F5] rounded-full transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h2 className="text-xl font-bold border-b-2 border-[#0D47A1] inline-block pb-1 text-[#FF8F00]">Cloud Sync</h2>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-md border border-[#B0BEC5] space-y-6">
        <div className="flex flex-col items-center text-center space-y-4">
          <div className={`w-16 h-16 rounded-full flex items-center justify-center ${accessToken ? 'bg-green-100' : 'bg-blue-100'}`}>
            <Cloud className={`w-8 h-8 ${accessToken ? 'text-green-600' : 'text-[#0D47A1]'}`} />
          </div>
          
          <div className="space-y-1">
            <h3 className="font-bold text-lg">Google Drive Backup</h3>
            <p className="text-xs text-[#78909C]">
              {accessToken 
                ? "Connected to Google Drive" 
                : "Connect your Google account to backup data to Drive"}
            </p>
          </div>
        </div>

        <div className="space-y-4">
          {!accessToken ? (
            <button
              onClick={handleConnect}
              className="w-full py-3 bg-[#0D47A1] text-white rounded-lg font-bold flex items-center justify-center gap-2 hover:bg-[#1565C0] transition-colors"
            >
              <User className="w-5 h-5" />
              Connect Google Account
            </button>
          ) : (
            <div className="space-y-3">
              <button
                onClick={syncToDrive}
                disabled={status === 'SYNCING'}
                className="w-full py-3 bg-green-600 text-white rounded-lg font-bold flex items-center justify-center gap-2 hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                {status === 'SYNCING' ? (
                  <RefreshCw className="w-5 h-5 animate-spin" />
                ) : (
                  <RefreshCw className="w-5 h-5" />
                )}
                Sync Data Now
              </button>
              
              <button
                onClick={() => setAccessToken(null)}
                className="w-full py-2 text-xs text-red-600 font-bold hover:bg-red-50 rounded-lg transition-colors"
              >
                Disconnect Account
              </button>
            </div>
          )}

          {status === 'SUCCESS' && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2 text-green-700 text-sm">
              <CheckCircle2 className="w-5 h-5" />
              Data synced successfully to Google Drive!
            </div>
          )}

          {status === 'ERROR' && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700 text-sm">
              <AlertCircle className="w-5 h-5" />
              {error || "Something went wrong"}
            </div>
          )}
        </div>

        <div className="p-4 bg-[#F5F9FD] rounded-lg border border-[#B0BEC5]/30">
          <h4 className="text-[10px] font-bold text-[#455A64] uppercase tracking-wider mb-2">Instructions</h4>
          <ul className="text-[10px] text-[#78909C] space-y-1 list-disc pl-4">
            <li>This will save your data in a file named <span className="font-mono">tracker_data.json</span> in your Google Drive.</li>
            <li>You can use this to restore your data on another device.</li>
            <li>Make sure you have a stable internet connection.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

// --- Bill & Quotation Helpers ---

const numberToWords = (num: number): string => {
  const a = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  const inWords = (n: number): string => {
    if (n < 20) return a[n];
    if (n < 100) return b[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + a[n % 10] : '');
    if (n < 1000) return a[Math.floor(n / 100)] + ' Hundred' + (n % 100 !== 0 ? ' ' + inWords(n % 100) : '');
    if (n < 100000) return inWords(Math.floor(n / 1000)) + ' Thousand' + (n % 1000 !== 0 ? ' ' + inWords(n % 1000) : '');
    if (n < 10000000) return inWords(Math.floor(n / 100000)) + ' Lakh' + (n % 100000 !== 0 ? ' ' + inWords(n % 100000) : '');
    return '';
  };

  return inWords(Math.floor(num)) + ' Taka Only';
};

const generateBillPDF = async (bill: Bill, action: 'download' | 'view' | 'blob' | 'share' = 'download', settings: PDFSettings = DEFAULT_PDF_SETTINGS) => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });
  
  // Helper to convert hex to RGB
  const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? [
      parseInt(result[1], 16),
      parseInt(result[2], 16),
      parseInt(result[3], 16)
    ] : [0, 0, 0];
  };

  const headerBgRgb = hexToRgb(settings.headerBgColor);
  const headerTextRgb = hexToRgb(settings.headerTextColor);
  const footerBgRgb = hexToRgb(settings.footerBgColor);
  const footerTextRgb = hexToRgb(settings.footerTextColor);

  // Single Large Watermark (Shifted further right and down)
  doc.setTextColor(220, 220, 220);
  doc.setFontSize(55);
  doc.setFont(settings.fontStyle, 'bold');
  doc.saveGraphicsState();
  doc.setGState(new (doc as any).GState({ opacity: 0.12 })); 
  
  // Shifted further right (140 -> 155) and down (210 -> 230)
  doc.text(settings.companyName, 155, 230, { align: 'center', angle: 45 });
  
  doc.restoreGraphicsState();

  // Header Background
  if (settings.headerBgColor.toUpperCase() !== '#FFFFFF') {
    doc.setFillColor(headerBgRgb[0], headerBgRgb[1], headerBgRgb[2]);
    doc.rect(0, 0, 210, 35, 'F'); // Increased height slightly for better logo fit
  }

  // Logo
  if (settings.logo) {
    try {
      const isWideLogo = settings.hideNameText;
      // Adjusted for 3000x250 (12:1) aspect ratio
      const logoWidth = isWideLogo ? 160 : 40;
      const logoHeight = isWideLogo ? 13.33 : 13.33;
      const logoX = isWideLogo ? (210 - logoWidth) / 2 : 20;
      const logoY = isWideLogo ? 10 : 10;
      doc.addImage(settings.logo, 'PNG', logoX, logoY, logoWidth, logoHeight);
    } catch (e) {
      console.error("Error adding logo to PDF", e);
    }
  }

  // Header
  if (!settings.hideNameText) {
    doc.setTextColor(headerTextRgb[0], headerTextRgb[1], headerTextRgb[2]);
    doc.setFontSize(24);
    doc.setFont(settings.fontStyle, 'bold'); 
    const nameX = settings.logo ? 60 : 105;
    const textAlign = settings.logo ? 'left' : 'center';
    doc.text(settings.companyName, nameX, 22, { align: textAlign });
  }
  
  // Info
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(10);
  doc.setFont(settings.fontStyle, 'normal');
  doc.text(`To,`, 20, 40);
  doc.text(`Dear Sir,`, 20, 45);
  doc.setFont(settings.fontStyle, 'bold');
  doc.text(bill.recipientName, 20, 50);
  
  doc.setFont(settings.fontStyle, 'normal');
  doc.text(`Date: ${new Date(bill.date).toLocaleDateString('en-GB')}`, 190, 40, { align: 'right' });
  doc.setFont(settings.fontStyle, 'bold');
  doc.text(`${bill.type === 'BILL' ? 'Bill No' : 'Quote No'}: ${bill.billNumber}${bill.revision && bill.revision > 0 ? ` (${bill.revision})` : ''}`, 190, 45, { align: 'right' });

  // Bill/Quotation Title in middle
  doc.setFontSize(16);
  doc.setFont(settings.fontStyle, 'bold');
  doc.text(bill.type, 105, 60, { align: 'center' });
  
  // Underline for Title
  const titleWidth = doc.getTextWidth(bill.type);
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.5);
  doc.line(105 - (titleWidth / 2), 62, 105 + (titleWidth / 2), 62);

  doc.setFontSize(10);
  doc.setFont(settings.fontStyle, 'bold');
  doc.text(`Site: `, 20, 70);
  doc.setFont(settings.fontStyle, 'normal');
  doc.text(bill.site, 30, 70);

  doc.setFont(settings.fontStyle, 'bold');
  doc.text(`Sub: `, 20, 80);
  doc.text(bill.subject, 30, 80);

  // Table
  const tableData = bill.items.map((item, index) => [
    index + 1,
    item.areaName,
    item.tiles,
    item.qty,
    item.unit,
    item.price.toFixed(2),
    item.total.toLocaleString('en-IN', { minimumFractionDigits: 2 })
  ]);

  autoTable(doc, {
    startY: 90,
    head: [['SL', 'Area Name', 'Tiles', 'Qty', 'Unit', 'Price', 'Total']],
    body: tableData,
    theme: 'grid',
    headStyles: { fillColor: [200, 200, 200], textColor: [0, 0, 0], fontStyle: 'bold', lineWidth: 0.1, halign: 'center', font: settings.fontStyle },
    styles: { fontSize: 8, cellPadding: 2, lineWidth: 0.1, font: settings.fontStyle, textColor: [40, 40, 40] },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 30, halign: 'center' },
      2: { cellWidth: 60 },
      3: { cellWidth: 15, halign: 'center' },
      4: { cellWidth: 15, halign: 'center' },
      5: { cellWidth: 20, halign: 'center' },
      6: { cellWidth: 30, halign: 'right' }
    },
    foot: [[
      { content: `In word: ${bill.totalInWords}`, colSpan: 6, styles: { fontStyle: 'bold', font: settings.fontStyle } },
      { content: `Tk. ${bill.grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, styles: { fontStyle: 'bold', halign: 'right', font: settings.fontStyle } }
    ]],
    footStyles: { fillColor: [255, 255, 255], textColor: [0, 0, 0], lineWidth: 0.1 }
  });

  const finalY = (doc as any).lastAutoTable.finalY || 150;

  // Signature
  doc.setFontSize(10);
  // Center both "Best regards" and the name in the signature area (right side)
  const signatureCenterX = 170;
  doc.setFont(settings.fontStyle, 'normal');
  doc.text('Best regards', signatureCenterX, finalY + 20, { align: 'center' });
  
  if (bill.signature) {
    try {
      doc.addImage(bill.signature, 'PNG', signatureCenterX - 15, finalY + 22, 30, 15);
    } catch (e) {
      console.error("Error adding signature to PDF", e);
    }
  }

  doc.setFont(settings.fontStyle, 'bold');
  doc.text(bill.preparedBy, signatureCenterX, finalY + 40, { align: 'center' });

  // Terms & Conditions
  if (bill.termsAndConditions) {
    doc.setFontSize(9);
    doc.setFont(settings.fontStyle, 'bold');
    doc.text('Terms & Conditions:', 20, finalY + 20);
    doc.setFont(settings.fontStyle, 'normal');
    const splitTerms = doc.splitTextToSize(bill.termsAndConditions, 120);
    doc.text(splitTerms, 20, finalY + 25);
  }

  // Footer Background
  if (settings.footerBgColor.toUpperCase() !== '#FFFFFF') {
    doc.setFillColor(footerBgRgb[0], footerBgRgb[1], footerBgRgb[2]);
    doc.rect(0, 280, 210, 17, 'F');
  }

  // Footer
  doc.setTextColor(footerTextRgb[0], footerTextRgb[1], footerTextRgb[2]);
  doc.setFontSize(8);
  doc.setFont(settings.fontStyle, 'normal');
  doc.text(`Address: ${settings.address} Email: ${settings.email}`, 105, 287, { align: 'center' });
  doc.text(`Contact: ${settings.contact}`, 105, 292, { align: 'center' });

  const fileName = `${bill.type}_${bill.billNumber}.pdf`;
  const isCapacitor = (window as any).Capacitor?.isNativePlatform();

  if (isCapacitor) {
    try {
      const pdfBase64 = doc.output('datauristring').split(',')[1];
      const result = await Filesystem.writeFile({
        path: fileName,
        data: pdfBase64,
        directory: Directory.Cache,
      });

      if (action === 'share') {
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
      console.error('Capacitor PDF Error:', e);
      if (action === 'download') doc.save(fileName);
    }
  } else {
    if (action === 'download') {
      doc.save(fileName);
    } else if (action === 'view') {
      const blobUrl = doc.output('bloburl');
      window.open(blobUrl, '_blank');
    } else if (action === 'share') {
      const pdfBlob = doc.output('blob');
      const file = new File([pdfBlob], fileName, { type: 'application/pdf' });
      if (navigator.share) {
        await navigator.share({
          files: [file],
          title: `${bill.type} - ${bill.recipientName}`,
          text: `Please find the ${bill.type.toLowerCase()} attached.`
        });
      } else {
        doc.save(fileName);
      }
    }
  }
  
  return doc;
};

function PDFSettingsView({ settings, onSave, onBack }: { settings: PDFSettings, onSave: (s: PDFSettings) => void, onBack: () => void }) {
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
        <button onClick={onBack} className="p-1 hover:bg-[#F5F5F5] rounded-full transition-colors cursor-pointer">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h2 className="text-xl font-bold border-b-2 border-[#0D47A1] inline-block pb-1">PDF Customization</h2>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-md border border-[#B0BEC5] space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Company Info */}
          <div className="space-y-4">
            <h3 className="font-bold text-[#0D47A1] border-b pb-2">Company Information</h3>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-[#78909C] uppercase">Company Name</label>
              <input 
                type="text" 
                value={form.companyName} 
                onChange={(e) => setForm({ ...form, companyName: e.target.value })}
                className="w-full p-2 border border-[#B0BEC5] rounded bg-[#F5F9FD] text-sm"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-[#78909C] uppercase">Address</label>
              <textarea 
                value={form.address} 
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                className="w-full p-2 border border-[#B0BEC5] rounded bg-[#F5F9FD] text-sm h-20"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-[#78909C] uppercase">Email</label>
              <input 
                type="email" 
                value={form.email} 
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full p-2 border border-[#B0BEC5] rounded bg-[#F5F9FD] text-sm"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-[#78909C] uppercase">Contact Number</label>
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
            <h3 className="font-bold text-[#0D47A1] border-b pb-2">Visual Customization</h3>
            
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-[#78909C] uppercase">Company Logo</label>
              <div className="flex items-center gap-4">
                <input 
                  type="file" 
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="text-xs cursor-pointer"
                />
                {form.logo && (
                  <div className="relative group">
                    <img src={form.logo} alt="Logo" className="h-12 border border-[#B0BEC5] rounded" />
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
                  onChange={(e) => setForm({ ...form, hideNameText: e.target.checked })}
                  className="w-4 h-4"
                />
                <label htmlFor="hideNameText" className="text-xs font-medium text-[#37474F]">Hide Company Name Text (Use if logo has name)</label>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-[#78909C] uppercase">Header BG Color</label>
                <div className="flex gap-2 items-center">
                  <input 
                    type="color" 
                    value={form.headerBgColor} 
                    onChange={(e) => setForm({ ...form, headerBgColor: e.target.value })}
                    className="w-10 h-10 p-0 border-0 rounded cursor-pointer"
                  />
                  <span className="text-xs font-mono uppercase">{form.headerBgColor}</span>
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-[#78909C] uppercase">Header Text Color</label>
                <div className="flex gap-2 items-center">
                  <input 
                    type="color" 
                    value={form.headerTextColor} 
                    onChange={(e) => setForm({ ...form, headerTextColor: e.target.value })}
                    className="w-10 h-10 p-0 border-0 rounded cursor-pointer"
                  />
                  <span className="text-xs font-mono uppercase">{form.headerTextColor}</span>
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-[#78909C] uppercase">Footer BG Color</label>
                <div className="flex gap-2 items-center">
                  <input 
                    type="color" 
                    value={form.footerBgColor} 
                    onChange={(e) => setForm({ ...form, footerBgColor: e.target.value })}
                    className="w-10 h-10 p-0 border-0 rounded cursor-pointer"
                  />
                  <span className="text-xs font-mono uppercase">{form.footerBgColor}</span>
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-[#78909C] uppercase">Footer Text Color</label>
                <div className="flex gap-2 items-center">
                  <input 
                    type="color" 
                    value={form.footerTextColor} 
                    onChange={(e) => setForm({ ...form, footerTextColor: e.target.value })}
                    className="w-10 h-10 p-0 border-0 rounded cursor-pointer"
                  />
                  <span className="text-xs font-mono uppercase">{form.footerTextColor}</span>
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-[#78909C] uppercase">Font Style</label>
              <select 
                value={form.fontStyle}
                onChange={(e) => setForm({ ...form, fontStyle: e.target.value as any })}
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
              alert('PDF Settings saved successfully!');
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
        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest text-center mb-4">Live Preview (Header & Footer)</p>
        
        <div className="bg-white shadow-lg max-w-md mx-auto overflow-hidden border border-slate-200">
          {/* Header Preview */}
          <div 
            style={{ backgroundColor: form.headerBgColor, color: form.headerTextColor }}
            className={`p-4 text-center border-b ${form.hideNameText && form.logo ? 'flex items-center justify-center' : ''}`}
          >
            {form.logo && <img src={form.logo} alt="Logo" className={`h-12 mx-auto ${!form.hideNameText ? 'mb-2' : ''}`} />}
            {!form.hideNameText && (
              <h4 className="font-bold text-lg uppercase" style={{ fontFamily: form.fontStyle }}>{form.companyName}</h4>
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
            style={{ backgroundColor: form.footerBgColor, color: form.footerTextColor }}
            className="p-3 text-center text-[8px] space-y-1"
          >
            <p style={{ fontFamily: form.fontStyle }}>{form.address} | Email: {form.email}</p>
            <p style={{ fontFamily: form.fontStyle }}>Contact: {form.contact}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function BillView({ type, nextNumber, onSave, onBack, initialBill, pdfSettings }: { type: 'BILL' | 'QUOTATION', nextNumber: number, onSave: (bill: Bill) => void, onBack: () => void, initialBill?: Bill, pdfSettings: PDFSettings }) {
  const billNumber = initialBill ? initialBill.billNumber : `AE${nextNumber.toString().padStart(4, '0')}`;
  const [recipientName, setRecipientName] = useState(initialBill?.recipientName || '');
  const [site, setSite] = useState(initialBill?.site || '');
  const [subject, setSubject] = useState(initialBill?.subject || (type === 'BILL' ? 'Bill for tiles installation work.' : 'Quotation for tiles installation work.'));
  const [date, setDate] = useState(initialBill?.date || new Date().toISOString().split('T')[0]);
  const [items, setItems] = useState<BillItem[]>(initialBill?.items || [
    { id: crypto.randomUUID(), areaName: '', tiles: '', qty: 0, unit: 'sft', price: 0, total: 0 }
  ]);
  const [preparedBy, setPreparedBy] = useState(initialBill?.preparedBy || 'Md Shahiduzzaman Anik');
  const [signature, setSignature] = useState<string | undefined>(initialBill?.signature || localStorage.getItem('savedSignature') || undefined);
  const [terms, setTerms] = useState(initialBill?.termsAndConditions || (type === 'QUOTATION' ? '1. Payment should be made within 7 days.\n2. 50% advance required.' : ''));

  const handleSignatureUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        setSignature(base64);
        localStorage.setItem('savedSignature', base64);
      };
      reader.readAsDataURL(file);
    }
  };

  const addItem = () => {
    setItems([...items, { id: crypto.randomUUID(), areaName: '', tiles: '', qty: 0, unit: 'sft', price: 0, total: 0 }]);
  };

  const removeItem = (id: string) => {
    if (items.length > 1) {
      setItems(items.filter(item => item.id !== id));
    }
  };

  const updateItem = (id: string, field: keyof BillItem, value: any) => {
    setItems(items.map(item => {
      if (item.id === id) {
        const updatedItem = { ...item, [field]: value };
        if (field === 'qty' || field === 'price') {
          updatedItem.total = (updatedItem.qty || 0) * (updatedItem.price || 0);
        }
        return updatedItem;
      }
      return item;
    }));
  };

  const grandTotal = items.reduce((sum, item) => sum + item.total, 0);

  const handleSave = async () => {
    if (!recipientName.trim()) {
      alert('Please enter recipient name');
      return;
    }

    let revision = initialBill?.revision || 0;
    if (initialBill && initialBill.grandTotal !== grandTotal) {
      revision += 1;
    }

    const newBill: Bill = {
      id: initialBill ? initialBill.id : crypto.randomUUID(),
      type,
      billNumber,
      date,
      recipientName,
      site,
      subject,
      items,
      totalInWords: numberToWords(grandTotal),
      grandTotal,
      preparedBy,
      signature,
      termsAndConditions: terms,
      timestamp: initialBill ? initialBill.timestamp : new Date().toLocaleString('en-GB'),
      revision
    };
    
    try {
      await onSave(newBill);
      // Automatically download PDF on save
      await generateBillPDF(newBill, 'download', pdfSettings);
    } catch (error) {
      console.error("Error in save sequence:", error);
      // Inner onSave handles alert already
    }
  };

  return (
    <div className="space-y-6 pb-20">
      <div className="flex items-center gap-2">
        <button onClick={onBack} className="p-1 hover:bg-[#F5F5F5] rounded-full transition-colors cursor-pointer">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h2 className="text-xl font-bold border-b-2 border-[#0D47A1] inline-block pb-1">
          {initialBill ? 'Edit' : 'Create'} {type === 'BILL' ? 'Bill' : 'Quotation'}
        </h2>
      </div>

      <div className="bg-white p-4 rounded-xl shadow-md border border-[#B0BEC5] space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-[#78909C] uppercase">Bill Number</label>
            <div className="w-full p-2 border border-[#B0BEC5] rounded bg-gray-100 text-sm font-bold text-[#0D47A1]">
              {billNumber}
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-[#78909C] uppercase">Recipient Name</label>
            <input 
              type="text" 
              value={recipientName} 
              onChange={(e) => setRecipientName(e.target.value)}
              className="w-full p-2 border border-[#B0BEC5] rounded bg-[#F5F9FD] text-sm"
              placeholder="Recipient Name"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-[#78909C] uppercase">Date</label>
            <input 
              type="date" 
              value={date} 
              onChange={(e) => setDate(e.target.value)}
              className="w-full p-2 border border-[#B0BEC5] rounded bg-[#F5F9FD] text-sm"
            />
          </div>
          <div className="space-y-1 md:col-span-2">
            <label className="text-[10px] font-bold text-[#78909C] uppercase">Site Name</label>
            <input 
              type="text" 
              value={site} 
              onChange={(e) => setSite(e.target.value)}
              className="w-full p-2 border border-[#B0BEC5] rounded bg-[#F5F9FD] text-sm"
              placeholder="Site Name"
            />
          </div>
          <div className="space-y-1 md:col-span-2">
            <label className="text-[10px] font-bold text-[#78909C] uppercase">Subject</label>
            <input 
              type="text" 
              value={subject} 
              onChange={(e) => setSubject(e.target.value)}
              className="w-full p-2 border border-[#B0BEC5] rounded bg-[#F5F9FD] text-sm"
            />
          </div>
          
          {type === 'QUOTATION' && (
            <div className="space-y-1 md:col-span-2">
              <label className="text-[10px] font-bold text-[#78909C] uppercase">Terms & Conditions</label>
              <textarea 
                value={terms} 
                onChange={(e) => setTerms(e.target.value)}
                className="w-full p-2 border border-[#B0BEC5] rounded bg-[#F5F9FD] text-sm h-20"
                placeholder="Enter terms and conditions..."
              />
            </div>
          )}

          <div className="space-y-1 md:col-span-2">
            <label className="text-[10px] font-bold text-[#78909C] uppercase">Signature (Upload Image)</label>
            <div className="flex items-center gap-4">
              <input 
                type="file" 
                accept="image/*"
                onChange={handleSignatureUpload}
                className="text-xs cursor-pointer"
              />
              {signature && (
                <img src={signature} alt="Signature" className="h-10 border border-[#B0BEC5] rounded" />
              )}
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <label className="text-[10px] font-bold text-[#78909C] uppercase">Items</label>
            <button onClick={addItem} className="text-xs font-bold text-[#0D47A1] flex items-center gap-1 hover:underline">
              <Plus className="w-3 h-3" /> Add Item
            </button>
          </div>
          
          <div className="space-y-3">
            {items.map((item, index) => (
              <div key={item.id} className="p-3 border border-[#B0BEC5]/30 rounded-lg bg-[#F5F9FD] space-y-2 relative pr-10">
                <button 
                  onClick={() => removeItem(item.id)}
                  className="absolute right-2 top-2 text-red-500 hover:bg-red-50 p-1 rounded"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <div className="grid grid-cols-2 gap-2">
                  <div className="col-span-2">
                    <input 
                      type="text" 
                      placeholder="Area Name"
                      value={item.areaName}
                      onChange={(e) => updateItem(item.id, 'areaName', e.target.value)}
                      className="w-full p-1.5 border border-[#B0BEC5] rounded text-xs"
                    />
                  </div>
                  <div className="col-span-2">
                    <input 
                      type="text" 
                      placeholder="Work Description"
                      value={item.tiles}
                      onChange={(e) => updateItem(item.id, 'tiles', e.target.value)}
                      className="w-full p-1.5 border border-[#B0BEC5] rounded text-xs"
                    />
                  </div>
                  <div>
                    <input 
                      type="number" 
                      placeholder="Qty"
                      value={item.qty || ''}
                      onChange={(e) => updateItem(item.id, 'qty', parseFloat(e.target.value) || 0)}
                      className="w-full p-1.5 border border-[#B0BEC5] rounded text-xs"
                    />
                  </div>
                  <div>
                    <input 
                      type="text" 
                      placeholder="Unit (sft/rft)"
                      value={item.unit}
                      onChange={(e) => updateItem(item.id, 'unit', e.target.value)}
                      className="w-full p-1.5 border border-[#B0BEC5] rounded text-xs"
                    />
                  </div>
                  <div>
                    <input 
                      type="number" 
                      placeholder="Price"
                      value={item.price || ''}
                      onChange={(e) => updateItem(item.id, 'price', parseFloat(e.target.value) || 0)}
                      className="w-full p-1.5 border border-[#B0BEC5] rounded text-xs"
                    />
                  </div>
                  <div className="flex items-center justify-end font-bold text-xs">
                    Total: {item.total.toLocaleString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="pt-4 border-t border-[#B0BEC5] flex justify-between items-center gap-2">
          <div className="px-3 py-2 bg-[#E8F5E9] text-[#2E7D32] rounded-lg font-bold text-xs sm:text-sm">
            Grand Total: Tk. {grandTotal.toLocaleString()}
          </div>
          <button 
            onClick={handleSave}
            className="px-3 py-2 bg-[#0D47A1] text-white rounded-lg font-bold hover:bg-[#1565C0] transition-all text-[10px] sm:text-sm"
          >
            {initialBill ? 'Update' : 'Submit'} {type === 'BILL' ? 'Bill' : 'Quotation'}
          </button>
        </div>
      </div>
    </div>
  );
}

function BillHistoryView({ bills, onEdit, onBack, pdfSettings, isAdmin }: { bills: Bill[], onEdit: (bill: Bill) => void, onBack: () => void, pdfSettings: PDFSettings, isAdmin: boolean }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'BILL' | 'QUOTATION'>('BILL');

  const filteredBills = bills.filter(b => 
    b.type === activeTab && (
      b.recipientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.site.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.billNumber.toLowerCase().includes(searchTerm.toLowerCase())
    )
  ).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const deleteBill = async (id: string) => {
    if (confirm("Are you sure you want to delete this?")) {
      try {
        await deleteDoc(doc(db, 'bills', id));
      } catch (error) {
        console.error("Error deleting bill:", error);
      }
    }
  };

  const handleShare = async (bill: Bill) => {
    await generateBillPDF(bill, 'share', pdfSettings);
  };

  return (
    <div className="space-y-6 pb-20">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button onClick={onBack} className="p-1 hover:bg-[#F5F5F5] rounded-full transition-colors cursor-pointer">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h2 className="text-xl font-bold border-b-2 border-[#0D47A1] inline-block pb-1">History</h2>
        </div>
      </div>

      <div className="flex bg-white p-1 rounded-lg border border-[#B0BEC5] shadow-sm">
        <button 
          onClick={() => setActiveTab('BILL')}
          className={`flex-1 py-2 text-xs font-bold rounded-md transition-all ${activeTab === 'BILL' ? 'bg-[#0D47A1] text-white shadow-md' : 'text-[#78909C] hover:bg-gray-50'}`}
        >
          Bills
        </button>
        <button 
          onClick={() => setActiveTab('QUOTATION')}
          className={`flex-1 py-2 text-xs font-bold rounded-md transition-all ${activeTab === 'QUOTATION' ? 'bg-[#0D47A1] text-white shadow-md' : 'text-[#78909C] hover:bg-gray-50'}`}
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
        {filteredBills.map(bill => (
          <div 
            key={bill.id} 
            onClick={async () => await generateBillPDF(bill, 'view', pdfSettings)}
            className="bg-white p-4 rounded-xl shadow-sm border border-[#B0BEC5] space-y-3 cursor-pointer hover:border-[#0D47A1] transition-colors"
          >
            <div className="flex justify-between items-start">
              <div>
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${bill.type === 'BILL' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                    {bill.type}
                  </span>
                  <span className="text-xs text-[#78909C]">{new Date(bill.date).toLocaleDateString('en-GB')}</span>
                </div>
                <h3 className="font-bold text-[#1A237E] mt-1">{bill.recipientName}</h3>
                <p className="text-xs text-[#78909C]">{bill.site}</p>
              </div>
              <div className="text-right">
                <p className="font-bold text-[#2E7D32]">{bill.grandTotal.toLocaleString()}</p>
              </div>
            </div>
            
            <div className="flex justify-end gap-2 pt-2 border-t border-[#B0BEC5]/20" onClick={(e) => e.stopPropagation()}>
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
                onClick={async () => await generateBillPDF(bill, 'download', pdfSettings)}
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
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [authMessage, setAuthMessage] = useState<{type: 'error' | 'success', text: string} | null>(null);

  const handleResetPassword = async () => {
    setAuthMessage(null);
    if (!email) {
      setAuthMessage({ type: 'error', text: "Please enter your email first to reset your password." });
      return;
    }
    try {
      setLoading(true);
      await sendPasswordResetEmail(auth, email);
      setAuthMessage({ type: 'success', text: `Password reset email sent to ${email}. If you previously logged in with Google, you can set a password this way.` });
    } catch (error: any) {
      console.error("Reset error:", error);
      setAuthMessage({ type: 'error', text: "Reset Error: " + error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthMessage(null);
    if (!email || !password) {
      setAuthMessage({ type: 'error', text: "Please enter email and password." });
      return;
    }
    if (!isLogin && password.length < 6) {
      setAuthMessage({ type: 'error', text: "Password should be at least 6 characters." });
      return;
    }
    setLoading(true);
    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
        if (email === 'bijoymahmudmunna@gmail.com') {
          setAuthMessage({ type: 'success', text: "Super Admin account created successfully!" });
        } else {
          setAuthMessage({ type: 'success', text: "Account created! Please wait for super admin approval." });
        }
      }
    } catch (error: any) {
      console.error("Auth error:", error);
      if (error.code === 'auth/invalid-credential') {
        setAuthMessage({ type: 'error', text: "Incorrect email or password. If you haven't created an account yet, please click 'Sign up' below. If you previously logged in with Google, click 'Forgot password?' to set a password." });
      } else if (error.code === 'auth/weak-password') {
        setAuthMessage({ type: 'error', text: "Password should be at least 6 characters." });
      } else if (error.code === 'auth/email-already-in-use') {
        setAuthMessage({ type: 'error', text: "An account with this email already exists. Please switch to 'Sign in'." });
      } else {
        setAuthMessage({ type: 'error', text: "Auth Error: " + error.message });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-6">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-white rounded-3xl shadow-xl border border-slate-100 p-8 text-center"
      >
        <div className="w-20 h-20 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-sm border border-blue-100">
          <ShieldCheck className="w-10 h-10 text-[#0D47A1]" />
        </div>
        <h1 className="text-2xl font-black text-[#1E293B] mb-2 tracking-tight">ALTASMIM ENGINEERING</h1>
        <p className="text-slate-500 font-medium mb-8">Management System {isLogin ? 'Login' : 'Signup'}</p>
        
        {authMessage && (
          <div className={`mb-6 p-4 rounded-xl text-sm font-medium text-left ${authMessage.type === 'error' ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-emerald-50 text-emerald-700 border border-emerald-100'}`}>
            {authMessage.text}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-left">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
            <input 
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#0D47A1] focus:border-transparent outline-none"
              placeholder="Enter your email"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
            <input 
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#0D47A1] focus:border-transparent outline-none"
              placeholder="Enter password"
              required
              minLength={isLogin ? undefined : 6}
            />
            {isLogin && (
              <div className="flex justify-end mt-2">
                <button
                  type="button"
                  onClick={handleResetPassword}
                  className="text-xs text-[#0D47A1] font-semibold hover:underline"
                >
                  Forgot password?
                </button>
              </div>
            )}
          </div>
          
          <button 
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 py-4 mt-6 rounded-2xl bg-[#0D47A1] text-white font-bold text-lg hover:bg-[#1565C0] transition-all active:scale-[0.98] shadow-lg shadow-blue-200 disabled:opacity-70"
          >
            {loading ? 'Processing...' : (isLogin ? 'Sign In' : 'Sign Up')}
          </button>
        </form>

        <div className="mt-6 pt-6 border-t border-slate-100">
          <p className="text-sm text-slate-600">
            {isLogin ? "Don't have an account?" : "Already have an account?"}
            <button 
              type="button"
              onClick={() => setIsLogin(!isLogin)}
              className="ml-2 font-semibold text-[#0D47A1] hover:underline"
            >
              {isLogin ? 'Sign up' : 'Sign in'}
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

function UserManagementView({ onBack }: { onBack: () => void }) {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingPermissionsUid, setEditingPermissionsUid] = useState<string | null>(null);

  useEffect(() => {
    const q = query(collection(db, 'users'));
    const unsubscribe = onSnapshot(q, (snap) => {
      const usersList = snap.docs.map(doc => doc.data() as UserProfile);
      setUsers(usersList);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const updateRole = async (uid: string, newRole: UserRole) => {
    try {
      await updateDoc(doc(db, 'users', uid), { role: newRole });
    } catch (error) {
      console.error("Failed to update role:", error);
      alert("Failed to update role. You might not have permission.");
    }
  };

  const toggleApproval = async (uid: string, currentStatus: boolean) => {
    try {
      await updateDoc(doc(db, 'users', uid), { isApproved: !currentStatus });
    } catch (error) {
      console.error("Failed to update approval:", error);
      alert("Failed to update approval. You might not have permission.");
    }
  };

  const updatePermission = async (uid: string, currentPermissions: any, module: string, newLevel: AccessLevel) => {
    try {
      const updatedPermissions = { ...currentPermissions, [module]: newLevel };
      await updateDoc(doc(db, 'users', uid), { permissions: updatedPermissions });
    } catch (error) {
      console.error("Failed to update permission:", error);
      alert("Failed to update permission. You might not have permission.");
    }
  };

  const modules = [
    { key: 'dashboard', label: 'Dashboard' },
    { key: 'addData', label: 'Add Data' },
    { key: 'payments', label: 'Payments' },
    { key: 'projects', label: 'Projects' },
    { key: 'revenue', label: 'Revenue' },
    { key: 'tomorrowWork', label: 'Tomorrow Work' },
    { key: 'billing', label: 'Billing' },
  ];

  return (
    <div className="space-y-6 pb-20">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button onClick={onBack} className="p-1 hover:bg-[#F5F5F5] rounded-full transition-colors cursor-pointer">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h2 className="text-xl font-bold border-b-2 border-[#0D47A1] inline-block pb-1">User Management</h2>
        </div>
      </div>

      <div className="grid gap-4">
        {loading ? (
          <div className="text-center py-10 text-slate-400">Loading users...</div>
        ) : (
          users.map(user => (
            <div key={user.uid} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-col gap-4">
              <div className="flex items-center justify-between gap-4 flex-wrap sm:flex-nowrap">
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${user.isApproved ? 'bg-blue-50 text-blue-600' : 'bg-slate-100 text-slate-400'}`}>
                    {user.displayName?.charAt(0) || 'U'}
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-slate-800 truncate">{user.displayName}</p>
                    <p className="text-xs text-slate-500 truncate">{user.email}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3 ml-auto sm:ml-0">
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${user.isApproved ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                      {user.isApproved ? 'APPROVED' : 'PENDING'}
                    </span>
                    <button
                      onClick={() => toggleApproval(user.uid, user.isApproved)}
                      disabled={user.email === 'bijoymahmudmunna@gmail.com'}
                      className={`p-1.5 rounded-lg transition-colors ${user.isApproved ? 'text-rose-500 hover:bg-rose-50' : 'text-emerald-500 hover:bg-emerald-50'} disabled:opacity-30`}
                      title={user.isApproved ? "Revoke Access" : "Approve User"}
                    >
                      {user.isApproved ? <ShieldX className="w-5 h-5" /> : <ShieldCheck className="w-5 h-5" />}
                    </button>
                  </div>

                  <div className="h-8 w-px bg-slate-100 hidden sm:block"></div>

                  <div className="flex items-center gap-2">
                    <select 
                      value={user.role}
                      onChange={(e) => updateRole(user.uid, e.target.value as UserRole)}
                      className="text-xs font-bold py-1.5 px-3 rounded-lg border border-slate-200 bg-slate-50 outline-none focus:ring-2 focus:ring-blue-500"
                      disabled={user.email === 'bijoymahmudmunna@gmail.com'}
                    >
                      <option value="member">Member</option>
                      <option value="admin">Admin</option>
                      <option value="super_admin">Super Admin</option>
                    </select>

                    <button 
                      onClick={() => setEditingPermissionsUid(editingPermissionsUid === user.uid ? null : user.uid)}
                      className="text-xs font-bold py-1.5 px-3 rounded-lg border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors"
                      disabled={user.email === 'bijoymahmudmunna@gmail.com'}
                    >
                      {editingPermissionsUid === user.uid ? 'Hide Perms' : 'Edit Perms'}
                    </button>
                  </div>
                </div>
              </div>

              {editingPermissionsUid === user.uid && user.permissions && (
                <div className="mt-2 p-4 bg-slate-50 rounded-xl border border-slate-100 text-sm">
                  <h4 className="font-bold text-slate-700 mb-3 text-xs uppercase tracking-wider">Module Permissions</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {modules.map(({key, label}) => (
                      <div key={key} className="flex flex-col bg-white p-2 rounded-lg border border-slate-100 shadow-sm">
                        <span className="text-xs font-semibold text-slate-500 mb-1">{label}</span>
                        <select 
                          value={(user.permissions as any)[key] || 'none'}
                          onChange={(e) => updatePermission(user.uid, user.permissions, key, e.target.value as AccessLevel)}
                          className="text-xs font-bold py-1.5 px-2 rounded -lg bg-slate-50 border border-slate-200"
                          disabled={user.email === 'bijoymahmudmunna@gmail.com'}
                        >
                          <option value="none">None</option>
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
    </div>
  );
}

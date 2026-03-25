import React, { useState, useEffect } from 'react';
import { 
  auth, 
  db, 
  googleProvider, 
  facebookProvider, 
  signInWithPopup, 
  signInWithRedirect,
  getRedirectResult,
  signOut, 
  onAuthStateChanged, 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  updateDoc, 
  increment, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  serverTimestamp, 
  Timestamp,
  FirebaseUser
} from './lib/firebase';
import { format } from 'date-fns';
import { LogIn, LogOut, Vote as VoteIcon, User as UserIcon, Settings, Plus, Trash2, Filter, Trophy, ChevronRight, ChevronLeft } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// --- Utilities ---
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Types ---
interface Candidate {
  id: string;
  name: string;
  mssv: string;
  content: string;
  voteCount: number;
  imageUrl?: string;
  createdAt?: any;
}

interface UserData {
  uid: string;
  email: string | null;
  displayName: string | null;
  role: 'user' | 'admin';
}

// --- Components ---

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'home' | 'voting' | 'admin' | 'login'>('home');
  const [error, setError] = useState<string | null>(null);

  // Auth Listener
  useEffect(() => {
    let unsubscribeUserDoc: (() => void) | null = null;

    // Handle redirect result
    getRedirectResult(auth).catch(err => {
      console.error('Redirect login error:', err);
      setError(err.message);
    });

    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        // Real-time listener for current user's data
        const userDocRef = doc(db, 'users', firebaseUser.uid);
        unsubscribeUserDoc = onSnapshot(userDocRef, async (snapshot) => {
          if (snapshot.exists()) {
            setUserData(snapshot.data() as UserData);
          } else {
            const newUserData: UserData = {
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              displayName: firebaseUser.displayName,
              role: firebaseUser.email === 'doandeqn123@gmail.com' ? 'admin' : 'user'
            };
            await setDoc(userDocRef, newUserData);
            setUserData(newUserData);
          }
          
          setLoading(false);
        });
      } else {
        setUserData(null);
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeUserDoc) unsubscribeUserDoc();
    };
  }, []);

  // Redirect away from login if user is present
  useEffect(() => {
    if (user && view === 'login') {
      setView('voting');
    }
  }, [user, view]);

  // Candidates Listener
  useEffect(() => {
    const q = query(collection(db, 'candidates'), orderBy('voteCount', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Candidate));
      setCandidates(list);
    });
    return () => unsubscribe();
  }, []);

  const handleLogin = async (provider: 'google' | 'facebook') => {
    try {
      const p = provider === 'google' ? googleProvider : facebookProvider;
      
      // Use redirect for mobile, popup for desktop
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || window.innerWidth < 768;
      
      if (isMobile) {
        await signInWithRedirect(auth, p);
      } else {
        await signInWithPopup(auth, p);
        setView('voting');
      }
    } catch (err: any) {
      console.error('Login error:', err);
      setError(err.message);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    setUser(null);
    setUserData(null);
    setView('home');
  };

  const handleVote = async (candidateId: string) => {
    if (!user) {
      setError(null);
      setView('login');
      return;
    }

    const today = format(new Date(), 'yyyy-MM-dd');
    const voteId = `${user.uid}_${today}`;
    const voteRef = doc(db, 'votes', voteId);

    try {
      const voteDoc = await getDoc(voteRef);
      if (voteDoc.exists()) {
        alert('Bạn đã bình chọn trong ngày hôm nay rồi!');
        return;
      }

      await setDoc(voteRef, {
        userId: user.uid,
        candidateId,
        date: today,
        timestamp: serverTimestamp()
      });

      await updateDoc(doc(db, 'candidates', candidateId), {
        voteCount: increment(1)
      });

      alert('Bình chọn thành công!');
    } catch (err: any) {
      console.error(err);
      alert('Có lỗi xảy ra khi bình chọn.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900 font-sans">
      {/* Navigation */}
      <nav className="bg-white border-b border-neutral-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => setView('home')}>
              <Trophy className="h-8 w-8 text-orange-500" />
              <span className="text-xl font-bold tracking-tight">VOTING PORTAL</span>
            </div>
            
            <div className="hidden md:flex items-center gap-8">
              <button onClick={() => setView('home')} className={cn("text-sm font-medium transition-colors", view === 'home' ? "text-orange-500" : "text-neutral-500 hover:text-neutral-900")}>Trang chủ</button>
              <button onClick={() => setView('voting')} className={cn("text-sm font-medium transition-colors", view === 'voting' ? "text-orange-500" : "text-neutral-500 hover:text-neutral-900")}>Bình chọn</button>
              {userData?.role === 'admin' && (
                <button onClick={() => setView('admin')} className={cn("text-sm font-medium transition-colors", view === 'admin' ? "text-orange-500" : "text-neutral-500 hover:text-neutral-900")}>Quản lý</button>
              )}
            </div>

            <div className="flex items-center gap-4">
              {user ? (
                <div className="flex items-center gap-3">
                  <div className="hidden sm:block text-right">
                    <p className="text-xs font-medium text-neutral-900">{user.displayName}</p>
                    <p className="text-[10px] text-neutral-500">{user.email}</p>
                  </div>
                  <button onClick={handleLogout} className="p-2 rounded-full hover:bg-neutral-100 transition-colors">
                    <LogOut className="h-5 w-5 text-neutral-500" />
                  </button>
                </div>
              ) : (
                <button onClick={() => { setError(null); setView('login'); }} className="bg-orange-500 text-white px-4 py-2 rounded-full text-sm font-medium hover:bg-orange-600 transition-colors flex items-center gap-2">
                  <LogIn className="h-4 w-4" /> Đăng nhập
                </button>
              )}
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {view === 'home' && <HomeView setView={setView} candidates={candidates} setError={setError} />}
        {view === 'voting' && <VotingView candidates={candidates} onVote={handleVote} user={user} />}
        {view === 'admin' && (userData?.role === 'admin' ? <AdminView candidates={candidates} /> : <div className="text-center py-20 text-neutral-500">Bạn không có quyền truy cập trang này.</div>)}
        {view === 'login' && <LoginView onLogin={handleLogin} error={error} />}
      </main>

      <footer className="bg-white border-t border-neutral-200 py-12 mt-12">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-sm text-neutral-500">© 2026 Voting Portal. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

// --- View Components ---

function HomeView({ setView, candidates, setError }: { setView: (v: any) => void, candidates: Candidate[], setError: (e: string | null) => void }) {
  const topCandidates = candidates.slice(0, 3);

  return (
    <div className="space-y-16">
      {/* Hero */}
      <section className="text-center space-y-6 py-12">
        <h1 className="text-5xl md:text-7xl font-bold tracking-tighter text-neutral-900 leading-tight">
          BÌNH CHỌN <br />
          <span className="text-orange-500">THÍ SINH ĐƯỢC YÊU THÍCH NHẤT</span>
        </h1>
        <p className="text-lg text-neutral-500 max-w-2xl mx-auto">
          Cổng bình chọn chính thức cho cuộc thi tài năng sinh viên. Mỗi tài khoản có 1 lượt bình chọn mỗi ngày.
        </p>
        <div className="flex justify-center gap-4 pt-4">
          <button onClick={() => { setError(null); setView('voting'); }} className="bg-neutral-900 text-white px-8 py-4 rounded-full font-bold hover:bg-neutral-800 transition-all transform hover:scale-105">
            Bình chọn ngay
          </button>
        </div>
      </section>

      {/* Leaderboard Preview */}
      <section className="space-y-8">
        <div className="flex items-end justify-between border-b border-neutral-200 pb-4">
          <div>
            <h2 className="text-2xl font-bold">Bảng xếp hạng hiện tại</h2>
            <p className="text-sm text-neutral-500 italic">Cập nhật thời gian thực</p>
          </div>
          <button onClick={() => setView('voting')} className="text-sm font-medium text-orange-500 flex items-center gap-1 hover:underline">
            Xem tất cả <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {topCandidates.map((c, i) => (
            <div key={c.id} className="bg-white p-6 rounded-3xl border border-neutral-200 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
              <div className="absolute top-4 right-4 bg-orange-500 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm">
                #{i + 1}
              </div>
              <div className="space-y-4">
                <div className="w-full aspect-square bg-neutral-100 rounded-2xl overflow-hidden">
                  <img 
                    src={c.imageUrl || `https://picsum.photos/seed/${c.id}/400/400`} 
                    alt={c.name} 
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <div>
                  <h3 className="text-xl font-bold">{c.name}</h3>
                  <p className="text-sm text-neutral-500">MSSV: {c.mssv}</p>
                  <p className="text-sm text-neutral-400 mt-2 line-clamp-2">{c.content}</p>
                </div>
                <div className="flex items-center justify-between pt-4 border-t border-neutral-100">
                  <span className="text-2xl font-black text-orange-500">{c.voteCount}</span>
                  <span className="text-xs font-medium text-neutral-400 uppercase tracking-widest">Lượt bình chọn</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function VotingView({ candidates, onVote, user }: { candidates: Candidate[], onVote: (id: string) => void, user: any }) {
  const [searchTerm, setSearchTerm] = useState('');

  const filtered = candidates.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.mssv.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h2 className="text-3xl font-bold">Danh sách thí sinh</h2>
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
          <input 
            type="text" 
            placeholder="Tìm kiếm tên hoặc MSSV..." 
            className="pl-10 pr-4 py-2 bg-white border border-neutral-200 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 w-full md:w-64"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {filtered.map(c => (
          <div key={c.id} className="bg-white rounded-2xl border border-neutral-200 overflow-hidden group">
            <div className="aspect-[3/4] overflow-hidden relative">
              <img 
                src={c.imageUrl || `https://picsum.photos/seed/${c.id}/400/533`} 
                alt={c.name} 
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                referrerPolicy="no-referrer"
              />
              <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent text-white">
                <p className="text-xs font-medium opacity-80 uppercase tracking-widest">{c.mssv}</p>
                <h3 className="text-lg font-bold leading-tight">{c.name}</h3>
              </div>
            </div>
            <div className="p-4 space-y-4">
              <p className="text-sm text-neutral-600 line-clamp-2 h-10">{c.content}</p>
              <div className="flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-xl font-black text-orange-500">{c.voteCount}</span>
                  <span className="text-[10px] text-neutral-400 uppercase font-bold">Lượt bình chọn</span>
                </div>
                <button 
                  onClick={() => onVote(c.id)}
                  className="bg-neutral-900 text-white p-3 rounded-xl hover:bg-orange-500 transition-colors shadow-lg shadow-neutral-200"
                >
                  <VoteIcon className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function LoginView({ onLogin, error }: { onLogin: (p: any) => void, error: string | null }) {
  return (
    <div className="max-w-md mx-auto py-12 space-y-8">
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-bold">Đăng nhập bình chọn</h2>
        <p className="text-neutral-500">Sử dụng tài khoản Google hoặc Facebook để tiếp tục</p>
      </div>
      
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl text-sm font-medium">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4">
        <button 
          onClick={() => onLogin('google')}
          className="flex items-center justify-center gap-2 bg-white border border-neutral-200 py-4 rounded-2xl font-bold hover:bg-neutral-50 transition-all shadow-sm"
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          Google
        </button>
        <button 
          onClick={() => onLogin('facebook')}
          className="flex items-center justify-center gap-2 bg-[#1877F2] text-white py-4 rounded-2xl font-bold hover:bg-[#166fe5] transition-all shadow-sm"
        >
          <svg className="h-5 w-5 fill-current" viewBox="0 0 24 24">
            <path d="M9.101 23.691v-7.98H6.627v-3.667h2.474v-1.58c0-4.03 1.764-5.908 5.73-5.908 1.202 0 2.247.086 2.548.126v2.95h-1.745c-1.956 0-2.334.926-2.334 2.29v1.122h4.312l-.56 3.667h-3.752v7.98H9.101z"/>
          </svg>
          Facebook
        </button>
      </div>
    </div>
  );
}

function AdminView({ candidates }: { candidates: Candidate[] }) {
  const [showAdd, setShowAdd] = useState(false);
  const [users, setUsers] = useState<UserData[]>([]);

  useEffect(() => {
    const q = query(collection(db, 'users'), orderBy('displayName'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setUsers(snapshot.docs.map(d => d.data() as UserData));
    });
    return () => unsubscribe();
  }, []);

  const toggleUserRole = async (targetUser: UserData) => {
    if (targetUser.email === 'doandeqn123@gmail.com') {
      alert('Không thể thay đổi quyền của Admin gốc!');
      return;
    }

    const newRole = targetUser.role === 'admin' ? 'user' : 'admin';
    const confirmMsg = `Bạn có chắc chắn muốn ${newRole === 'admin' ? 'nâng cấp' : 'hạ cấp'} người dùng ${targetUser.displayName}?`;
    
    if (confirm(confirmMsg)) {
      try {
        await updateDoc(doc(db, 'users', targetUser.uid), {
          role: newRole
        });
        alert('Cập nhật quyền thành công!');
      } catch (err) {
        alert('Lỗi khi cập nhật quyền');
      }
    }
  };

  const handleAddCandidate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const newCandidate = {
      name: formData.get('name') as string,
      mssv: formData.get('mssv') as string,
      content: formData.get('content') as string,
      voteCount: 0,
      imageUrl: formData.get('imageUrl') as string || `https://picsum.photos/seed/${Date.now()}/400/533`,
      createdAt: serverTimestamp()
    };

    try {
      await setDoc(doc(collection(db, 'candidates')), newCandidate);
      setShowAdd(false);
      alert('Thêm thí sinh thành công!');
    } catch (err) {
      alert('Lỗi khi thêm thí sinh');
    }
  };

  const handleDeleteCandidate = async (id: string) => {
    if (confirm('Bạn có chắc chắn muốn xóa thí sinh này?')) {
      try {
        // In a real app, we'd delete the doc. For this demo, let's just alert.
        // await deleteDoc(doc(db, 'candidates', id));
        alert('Tính năng xóa đang được bảo trì.');
      } catch (err) {
        alert('Lỗi khi xóa');
      }
    }
  };

  return (
    <div className="space-y-12">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold">Bảng điều khiển Admin</h2>
        <button 
          onClick={() => setShowAdd(!showAdd)}
          className="bg-orange-500 text-white px-6 py-2 rounded-full font-bold flex items-center gap-2 hover:bg-orange-600 transition-colors"
        >
          <Plus className="h-5 w-5" /> Thêm thí sinh
        </button>
      </div>

      {showAdd && (
        <div className="bg-white p-8 rounded-3xl border border-neutral-200 shadow-xl max-w-2xl mx-auto">
          <h3 className="text-xl font-bold mb-6">Thêm thí sinh mới</h3>
          <form onSubmit={handleAddCandidate} className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1">
              <label className="text-xs font-bold text-neutral-400 uppercase">Tên thí sinh</label>
              <input name="name" required className="w-full px-4 py-2 border border-neutral-200 rounded-lg" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-neutral-400 uppercase">MSSV</label>
              <input name="mssv" required className="w-full px-4 py-2 border border-neutral-200 rounded-lg" />
            </div>
            <div className="md:col-span-2 space-y-1">
              <label className="text-xs font-bold text-neutral-400 uppercase">Nội dung thi</label>
              <textarea name="content" required className="w-full px-4 py-2 border border-neutral-200 rounded-lg h-24" />
            </div>
            <div className="md:col-span-2 space-y-1">
              <label className="text-xs font-bold text-neutral-400 uppercase">URL Ảnh (Tùy chọn)</label>
              <input name="imageUrl" className="w-full px-4 py-2 border border-neutral-200 rounded-lg" placeholder="https://..." />
            </div>
            <div className="md:col-span-2 flex gap-3 pt-4">
              <button type="submit" className="flex-1 bg-neutral-900 text-white py-3 rounded-xl font-bold hover:bg-neutral-800">Lưu thí sinh</button>
              <button type="button" onClick={() => setShowAdd(false)} className="flex-1 bg-neutral-100 text-neutral-500 py-3 rounded-xl font-bold hover:bg-neutral-200">Hủy</button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        {/* Candidates List */}
        <div className="lg:col-span-2 space-y-6">
          <h3 className="text-xl font-bold flex items-center gap-2">
            <Settings className="h-5 w-5 text-neutral-400" /> Quản lý thí sinh
          </h3>
          <div className="bg-white border border-neutral-200 rounded-2xl overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-neutral-50 border-b border-neutral-200">
                <tr>
                  <th className="px-6 py-4 text-xs font-bold text-neutral-400 uppercase">Thí sinh</th>
                  <th className="px-6 py-4 text-xs font-bold text-neutral-400 uppercase">MSSV</th>
                  <th className="px-6 py-4 text-xs font-bold text-neutral-400 uppercase">Bình chọn</th>
                  <th className="px-6 py-4 text-xs font-bold text-neutral-400 uppercase">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {candidates.map(c => (
                  <tr key={c.id} className="hover:bg-neutral-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <img src={c.imageUrl || `https://picsum.photos/seed/${c.id}/100/100`} className="h-10 w-10 rounded-full object-cover" alt="" />
                        <span className="font-medium">{c.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-neutral-500">{c.mssv}</td>
                    <td className="px-6 py-4 font-bold text-orange-500">{c.voteCount}</td>
                    <td className="px-6 py-4">
                      <button onClick={() => handleDeleteCandidate(c.id)} className="p-2 text-neutral-400 hover:text-red-500 transition-colors">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Users List */}
        <div className="space-y-6">
          <h3 className="text-xl font-bold flex items-center gap-2">
            <UserIcon className="h-5 w-5 text-neutral-400" /> Người dùng hệ thống
          </h3>
          <div className="bg-white border border-neutral-200 rounded-2xl p-6 space-y-4 max-h-[600px] overflow-y-auto">
            {users.map((u, i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-xl hover:bg-neutral-50 transition-colors group">
                <div className="h-10 w-10 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center font-bold">
                  {u.displayName?.[0] || 'U'}
                </div>
                <div className="flex-1 overflow-hidden">
                  <p className="text-sm font-bold truncate">{u.displayName}</p>
                  <p className="text-xs text-neutral-500 truncate">{u.email}</p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className={cn("text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-tighter", u.role === 'admin' ? "bg-red-100 text-red-600" : "bg-neutral-100 text-neutral-500")}>
                    {u.role}
                  </span>
                  {u.email !== 'doandeqn123@gmail.com' && (
                    <button 
                      onClick={() => toggleUserRole(u)}
                      className="text-[10px] font-bold text-orange-500 hover:underline opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      {u.role === 'admin' ? 'Hạ cấp' : 'Nâng cấp'}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

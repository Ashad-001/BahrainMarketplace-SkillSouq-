"use client";
import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import supabase from '@/lib/supabase';

interface VerificationRequest {
  id: string;
  user_id: string;
  name: string;
  profession_type: string;
  document_path: string;
  status: string;
  submitted_at: string;
}

export default function VerificationQueue() {
  // ✅ THE FIX: Start completely empty and let useEffect fetch real data from Supabase
  const [pendingRequests, setPendingRequests] = useState<VerificationRequest[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let mounted = true;
    const fetchPending = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('verifications')
          .select('*')
          .eq('status', 'pending')
          .order('created_at', { ascending: false });
        if (error) console.error('Supabase error fetching verifications', error);
        if (mounted) setPendingRequests(data ?? []);
      } catch (err) {
        console.error(err);
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    fetchPending();
    return () => { mounted = false; };
  }, []);

  const viewDocument = async (path: string) => {
    try {
      const { data, error } = await supabase.storage
        .from('verifications')
        .createSignedUrl(path, 60);

      if (error) throw error;

      if (data?.signedUrl) {
        window.open(data.signedUrl, '_blank');
      }
    } catch (error: any) {
      toast.error('Vault error: ' + error.message);
    }
  };

  const handleApprove = async (requestId: string, userId: string) => {
    try {
      const { data: vData, error: verifyError } = await supabase
        .from('verifications')
        .update({ status: 'verified' })
        .eq('id', requestId)
        .select();

      if (verifyError) throw verifyError;
      if (!vData || vData.length === 0) {
        throw new Error('Verification Update Failed: RLS blocked it.');
      }

      const { data: pData, error: profileError } = await supabase
        .from('profiles')
        .update({ is_verified: true })
        .eq('id', userId)
        .select();

      if (profileError) throw profileError;
      if (!pData || pData.length === 0) {
        throw new Error('Profile Update Failed: Check your column name or RLS.');
      }

      setPendingRequests(prev => prev.filter(req => req.id !== requestId));
      toast.success('User successfully verified!');
    } catch (error: any) {
      toast.error(error.message);
      console.error(error);
    }
  };

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-zinc-200 dark:border-zinc-800 overflow-hidden">
      <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 flex justify-between items-center">
        <h2 className="text-lg font-bold text-zinc-900 dark:text-white">Pending Verifications</h2>
        <span className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 text-xs font-bold px-2.5 py-1 rounded-full">
          {pendingRequests.length} Pending
        </span>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-zinc-50 dark:bg-zinc-950/50 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
              <th className="p-4 border-b border-zinc-200 dark:border-zinc-800">User / Agency</th>
              <th className="p-4 border-b border-zinc-200 dark:border-zinc-800">Profession</th>
              <th className="p-4 border-b border-zinc-200 dark:border-zinc-800">Submitted</th>
              <th className="p-4 border-b border-zinc-200 dark:border-zinc-800 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {pendingRequests.length === 0 ? (
              <tr>
                <td colSpan={4} className="p-8 text-center text-zinc-500">No pending verifications. You are all caught up!</td>
              </tr>
            ) : (
              pendingRequests.map((req) => (
                <tr key={req.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                  <td className="p-4 font-medium text-zinc-900 dark:text-white">
                    {req.name || req.user_id}
                    <div className="text-xs text-zinc-500 font-normal mt-0.5">{req.user_id}</div>
                  </td>
                  <td className="p-4">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                      {req.profession_type.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="p-4 text-sm text-zinc-600 dark:text-zinc-400">
                    {req.submitted_at || req.created_at || 'Recent'}
                  </td>
                  <td className="p-4 flex justify-end gap-2">
                    <button 
                      onClick={() => viewDocument(req.document_path)}
                      className="px-3 py-1.5 text-sm font-medium text-zinc-700 bg-white border border-zinc-300 rounded-lg hover:bg-zinc-50 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-700 transition-colors"
                    >
                      View
                    </button>
                    <button 
                      onClick={() => handleApprove(req.id, req.user_id)}
                      disabled={isLoading}
                      className="px-4 py-1.5 text-sm font-bold text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 rounded-lg transition-colors"
                    >
                      Approve
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

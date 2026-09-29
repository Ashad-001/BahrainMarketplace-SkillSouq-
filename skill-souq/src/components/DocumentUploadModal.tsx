"use client";
import { useState, useRef } from 'react';
import { createClient } from '@/utils/supabase/client';
import { supabase } from '@/lib/supabase';

interface DocumentUploadModalProps {
  isOpen: boolean;
  onClose: (wasSuccessful: boolean) => void;
  profession: string;
  userId: string;
}

export default function DocumentUploadModal({ isOpen, onClose, profession, userId }: DocumentUploadModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const requiredDocument = profession === 'clearance_agency'
    ? 'Commercial Registration (CR) Certificate'
    : profession === 'lawyer'
    ? 'Ministry of Justice License'
    : 'Official ID & Credentials';

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setError('');
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0]);
      setError('');
    }
  };

  const submitDocument = async () => {
    if (!file) {
      setError('Please select a file first.');
      return;
    }

    setIsUploading(true);
    setError('');

    try {
      // 1. Upload to the secure 'verifications' bucket
      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}-${Date.now()}.${fileExt}`;
      const filePath = `${profession}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('verifications')
        .upload(filePath, file);

      // 🚨 THIS WILL TELL US IF STORAGE IS FAILING
      if (uploadError) throw new Error("VAULT ERROR: " + uploadError.message);

      // 2. Log it in the verifications database table
      const { error: dbError } = await supabase
        .from('verifications')
        .insert({
          user_id: userId,
          profession_type: profession,
          document_path: filePath,
          status: 'pending'
        });

      // 🚨 THIS WILL TELL US IF DATABASE IS FAILING
      if (dbError) throw new Error("DB ERROR: " + dbError.message);

      // Success!
      onClose(true); 
      
    } catch (err) {
      // This prints the exact error to the red text on your screen
      // @ts-ignore
      setError(err.message);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-zinc-900 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100 dark:border-zinc-800">
          <h2 className="text-lg font-bold text-zinc-900 dark:text-white">Verify Your Account</h2>
          <button onClick={() => onClose(false)} className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="p-6">
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-4">
            To activate your seller profile, please upload your <span className="font-bold text-zinc-900 dark:text-white">{requiredDocument}</span>.
          </p>

          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`mt-2 flex flex-col items-center justify-center w-full h-40 border-2 border-dashed rounded-xl cursor-pointer transition-colors ${
              isDragging ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/10' : 'border-zinc-300 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800'
            }`}
          >
            {file ? (
              <div className="flex flex-col items-center text-center px-4">
                <svg className="w-8 h-8 text-green-500 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                <span className="text-sm font-semibold text-zinc-900 dark:text-white truncate max-w-[200px]">{file.name}</span>
                <span className="text-xs text-zinc-500 mt-1">Click to change file</span>
              </div>
            ) : (
              <div className="flex flex-col items-center text-zinc-500 dark:text-zinc-400">
                <svg className="w-10 h-10 mb-3 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
                <span className="text-sm font-medium">Click to upload or drag and drop</span>
                <span className="text-xs mt-1">PDF, PNG, or JPG (Max 5MB)</span>
              </div>
            )}
            <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept=".pdf,.png,.jpg,.jpeg" />
          </div>

          {error && <p className="text-red-500 text-sm mt-3 text-center">{error}</p>}

          <button
            onClick={submitDocument}
            disabled={!file || isUploading}
            className="w-full mt-6 bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-300 dark:disabled:bg-zinc-700 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-xl transition-colors flex justify-center items-center gap-2"
          >
            {isUploading ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                Uploading securely...
              </>
            ) : (
              'Submit for Verification'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

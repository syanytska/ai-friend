"use client";

import { useState } from "react";

type SettingsModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSaveLogo: (url: string) => void;
  onSaveBg: (url: string) => void;
  currentLogo?: string;
  currentBg?: string;
};

export default function SettingsModal({
  isOpen,
  onClose,
  onSaveLogo,
  onSaveBg,
  currentLogo,
  currentBg,
}: SettingsModalProps) {
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [bgFile, setBgFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleUpload = async (type: "logo" | "bg") => {
    try {
      setError(null);
      setUploading(true);
      const file = type === "logo" ? logoFile : bgFile;
      if (!file) {
        setError("No file selected");
        return;
      }

      const data = await fileToBase64(file);
      const res = await fetch("/api/assets/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename: file.name, data }),
      });

      if (!res.ok) throw new Error("Upload failed");
      const { url } = await res.json();

      // save to user settings
      const settingsRes = await fetch("/api/user/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: `ui_${type}`, value: url }),
      });

      if (!settingsRes.ok) throw new Error("Failed to save setting");

      if (type === "logo") {
        onSaveLogo(url);
        setLogoFile(null);
      } else {
        onSaveBg(url);
        setBgFile(null);
      }
    } catch (e: any) {
      setError(e.message || "Error uploading");
    } finally {
      setUploading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-96 max-h-[90vh] overflow-auto">
        <h2 className="text-lg font-bold mb-4">Settings</h2>

        {/* Logo */}
        <div className="mb-6">
          <label className="block text-sm font-medium mb-2">Logo</label>
          {currentLogo && (
            <div className="mb-2">
              <img src={currentLogo} alt="Logo" className="h-16 border rounded" />
            </div>
          )}
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setLogoFile(e.target.files?.[0] || null)}
            className="block w-full text-sm mb-2"
          />
          <button
            onClick={() => handleUpload("logo")}
            disabled={!logoFile || uploading}
            className="w-full px-3 py-2 bg-blue-600 text-white rounded disabled:opacity-60"
          >
            {uploading ? "Uploading..." : "Upload Logo"}
          </button>
        </div>

        {/* Background */}
        <div className="mb-6">
          <label className="block text-sm font-medium mb-2">Background</label>
          {currentBg && (
            <div className="mb-2">
              <img src={currentBg} alt="Background" className="w-full h-20 object-cover border rounded" />
            </div>
          )}
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setBgFile(e.target.files?.[0] || null)}
            className="block w-full text-sm mb-2"
          />
          <button
            onClick={() => handleUpload("bg")}
            disabled={!bgFile || uploading}
            className="w-full px-3 py-2 bg-blue-600 text-white rounded disabled:opacity-60"
          >
            {uploading ? "Uploading..." : "Upload Background"}
          </button>
        </div>

        {error && <div className="p-2 bg-red-100 text-red-700 rounded mb-4">{error}</div>}

        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 px-3 py-2 border rounded hover:bg-gray-100"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

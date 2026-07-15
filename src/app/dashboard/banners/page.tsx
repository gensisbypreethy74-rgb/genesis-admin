'use client';

import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import axios from 'axios';

interface IBanner {
  _id: string;
  title: string;
  description: string;
  image: string;
  mobileImage?: string;
  status: string;
}

export default function BannersPage() {
  const [banners, setBanners] = useState<IBanner[]>([]);
  const [isAddBannerOpen, setIsAddBannerOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteModal, setDeleteModal] = useState<{isOpen: boolean, bannerId: string | null}>({ isOpen: false, bannerId: null });

  // Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [image, setImage] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [mobileImage, setMobileImage] = useState('');
  const [mobileImageFile, setMobileImageFile] = useState<File | null>(null);

  const fetchBanners = async () => {
    try {
      const res = await axios.get(`${process.env.NEXT_PUBLIC_BACKEND_URL}/v1/banners`);
      const data = res.data;
      if (data.success) {
        setBanners(data.data);
      }
    } catch (err) {
      console.error('Failed to fetch banners', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBanners();
  }, []);

  const handleAddClick = () => {
    setEditingId(null);
    setTitle('');
    setDescription('');
    setImage('');
    setImageFile(null);
    setMobileImage('');
    setMobileImageFile(null);
    setIsAddBannerOpen(true);
  };

  const handleEditClick = (banner: IBanner) => {
    setEditingId(banner._id);
    setTitle(banner.title);
    setDescription(banner.description);
    setImage(banner.image);
    setImageFile(null);
    setMobileImage(banner.mobileImage || '');
    setMobileImageFile(null);
    setIsAddBannerOpen(true);
  };

  const handleClosePanel = () => {
    setIsAddBannerOpen(false);
    setEditingId(null);
    setImageFile(null);
    setMobileImageFile(null);
  };

  const handleSubmit = async () => {
    if (!title || !description || (!image && !imageFile) || (!mobileImage && !mobileImageFile)) {
      return toast.error('Title, description, and both images are required');
    }

    const MAX_FILE_SIZE = 3 * 1024 * 1024; // 3MB

    if (imageFile && imageFile.size > MAX_FILE_SIZE) {
      return toast.error('Laptop image size must be less than 3MB');
    }

    if (mobileImageFile && mobileImageFile.size > MAX_FILE_SIZE) {
      return toast.error('Phone image size must be less than 3MB');
    }

    setSaving(true);
    const token = localStorage.getItem('adminToken');
    
    const formData = new FormData();
    formData.append('title', title);
    formData.append('description', description);
    formData.append('status', 'ACTIVE');
    
    if (imageFile) {
      formData.append('image', imageFile);
    } else if (image) {
      formData.append('image', image);
    }
    
    if (mobileImageFile) {
      formData.append('mobileImage', mobileImageFile);
    } else if (mobileImage) {
      formData.append('mobileImage', mobileImage);
    }

    try {
      const url = editingId 
        ? `${process.env.NEXT_PUBLIC_BACKEND_URL}/v1/banners/${editingId}` 
        : `${process.env.NEXT_PUBLIC_BACKEND_URL}/v1/banners`;
      const method = editingId ? 'put' : 'post';

      const res = await axios({
        method,
        url,
        headers: {
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${token}`
        },
        data: formData
      });
      
      const data = res.data;
      if (data.success) {
        toast.success(editingId ? 'Banner updated successfully' : 'Banner created successfully');
        handleClosePanel();
        fetchBanners();
      } else {
        toast.error(data.message || 'Failed to save banner');
      }
    } catch (err) {
      console.error(err);
      toast.error('Error connecting to backend');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteClick = (id: string) => {
    setDeleteModal({ isOpen: true, bannerId: id });
  };

  const confirmDelete = async () => {
    if(!deleteModal.bannerId) return;
    setDeleting(true);
    const token = localStorage.getItem('adminToken');
    try {
      const res = await axios.delete(`${process.env.NEXT_PUBLIC_BACKEND_URL}/v1/banners/${deleteModal.bannerId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = res.data;
      if (data.success) {
        toast.success('Banner deleted successfully');
        fetchBanners();
        setDeleteModal({ isOpen: false, bannerId: null });
      } else {
        toast.error(data.message);
      }
    } catch (err) {
      console.error(err);
      toast.error('Error deleting banner');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="max-w-[1600px] mx-auto mt-2 pb-12">
      <div className="flex flex-col xl:flex-row gap-6 items-start">
        
        {/* Left Column: Banners Catalog */}
        <div className="flex-1 min-w-0 bg-white rounded-[24px] p-6 lg:p-8 shadow-sm border border-slate-100/60 w-full transition-all duration-300">
          
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-[16px] font-medium text-slate-800">Homepage Banners</h2>
            <button 
              onClick={handleAddClick}
              className="bg-[#5b3db8] hover:bg-[#4a2f96] text-white px-6 py-2.5 rounded-[12px] font-medium text-[14px] flex items-center gap-2 transition-colors shadow-sm"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
              Add New Banner
            </button>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead>
                <tr className="bg-[#f8fafc]">
                  <th className="py-4 px-6 text-[13px] font-semibold text-slate-500 rounded-l-[12px] w-[35%]">Preview</th>
                  <th className="py-4 px-6 text-[13px] font-semibold text-slate-500 w-[20%]">Title</th>
                  <th className="py-4 px-6 text-[13px] font-semibold text-slate-500 w-[30%]">Description</th>
                  <th className="py-4 px-6 text-[13px] font-semibold text-slate-500 rounded-r-[12px] w-[15%]">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={4} className="py-8 text-center text-slate-500">Loading banners...</td></tr>
                ) : banners.length === 0 ? (
                  <tr><td colSpan={4} className="py-8 text-center text-slate-500">No banners found. Add your first banner!</td></tr>
                ) : banners.map((banner) => (
                  <tr key={banner._id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50 transition-colors">
                    <td className="py-5 px-6">
                      <div className="flex gap-3">
                        <div className="flex flex-col gap-1">
                          <span className="text-[10px] text-slate-500 font-semibold uppercase">Laptop</span>
                          <img 
                            src={banner.image && banner.image.startsWith('/') ? `${process.env.NEXT_PUBLIC_BACKEND_URL?.replace('/api', '') || 'http://localhost:5000'}${banner.image}` : banner.image} 
                            alt={banner.title} 
                            className="w-[120px] h-[60px] rounded-[8px] object-cover bg-slate-100 shadow-sm border border-slate-200" 
                          />
                        </div>
                        {banner.mobileImage && (
                          <div className="flex flex-col gap-1">
                            <span className="text-[10px] text-slate-500 font-semibold uppercase">Mobile</span>
                            <img 
                              src={banner.mobileImage.startsWith('/') ? `${process.env.NEXT_PUBLIC_BACKEND_URL?.replace('/api', '') || 'http://localhost:5000'}${banner.mobileImage}` : banner.mobileImage} 
                              alt={`${banner.title} mobile`} 
                              className="w-[40px] h-[60px] rounded-[8px] object-cover bg-slate-100 shadow-sm border border-slate-200" 
                            />
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="py-5 px-6 font-bold text-[#111827] text-[15px]">{banner.title}</td>
                    <td className="py-5 px-6 text-[15px] text-slate-700 font-medium leading-snug">{banner.description}</td>
                    <td className="py-5 px-6">
                      <div className="flex items-center gap-3">
                        <button 
                          onClick={() => handleEditClick(banner)}
                          className="w-[38px] h-[38px] rounded-[10px] bg-[#eff6ff] text-[#5b3db8] hover:bg-[#ece7f8] flex items-center justify-center transition-colors"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                        </button>
                        <button 
                          onClick={() => handleDeleteClick(banner._id)}
                          className="w-[38px] h-[38px] rounded-[10px] bg-[#fef2f2] text-[#ef4444] hover:bg-red-100 flex items-center justify-center transition-colors"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Column: Add/Edit Banner Form */}
        {isAddBannerOpen && (
          <div className="w-full xl:w-[420px] shrink-0 bg-white shadow-sm border border-slate-100/60 rounded-[24px] xl:sticky xl:top-[120px] overflow-hidden flex flex-col xl:max-h-[calc(100vh-140px)] transition-all duration-300">
            {/* Header */}
            <div className="flex items-center justify-between px-6 lg:px-8 py-6 shrink-0">
              <h2 className="text-[20px] font-bold text-[#111827]">
                {editingId ? 'Edit Banner' : 'Add New Banner'}
              </h2>
              <button 
                onClick={handleClosePanel}
                className="w-[32px] h-[32px] rounded-full bg-slate-50 flex items-center justify-center text-slate-500 hover:bg-slate-100 transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              </button>
            </div>

            {/* Scrollable Form */}
            <div className="flex-1 overflow-y-auto px-6 lg:px-8 pb-8 space-y-6 form-scrollbar">
              {/* Banner Title */}
              <div>
                <label className="block text-[13px] font-bold text-[#111827] mb-2.5">Banner Title</label>
                <input 
                  type="text" 
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  className="w-full h-[48px] px-4 rounded-[12px] border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#5b3db8]/20 focus:border-[#5b3db8] transition-all text-[14px]" 
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-[13px] font-bold text-[#111827] mb-2.5">Description</label>
                <input 
                  type="text" 
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  className="w-full h-[48px] px-4 rounded-[12px] border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#5b3db8]/20 focus:border-[#5b3db8] transition-all text-[14px]" 
                />
              </div>

              {/* Laptop Image Upload */}
              <div>
                <label className="block text-[13px] font-bold text-[#111827] mb-2.5">Laptop Size Photo</label>
                <input 
                  type="file" 
                  accept="image/*"
                  onChange={e => {
                    if (e.target.files && e.target.files.length > 0) {
                      const file = e.target.files[0];
                      if (file.size > 3 * 1024 * 1024) {
                        toast.error('Image size must be less than 3MB');
                        e.target.value = '';
                        return;
                      }
                      setImageFile(file);
                      setImage('');
                    }
                  }}
                  className="w-full text-[14px] file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-[#f4f1fb] file:text-[#5b3db8] hover:file:bg-[#ece7f8] transition-colors cursor-pointer" 
                />
                {(image || imageFile) && (
                  <div className="mt-4">
                    <p className="text-[12px] font-semibold text-slate-500 mb-2">Image Preview</p>
                    <img 
                      src={imageFile ? URL.createObjectURL(imageFile) : (image.startsWith('/') ? `${process.env.NEXT_PUBLIC_BACKEND_URL?.replace('/api', '') || 'http://localhost:5000'}${image}` : image)} 
                      alt="Preview" 
                      className="w-full h-[120px] rounded-lg object-cover border border-slate-200 shadow-sm"
                    />
                  </div>
                )}
              </div>

              {/* Mobile Image Upload */}
              <div>
                <label className="block text-[13px] font-bold text-[#111827] mb-2.5">Phone Size Photo</label>
                <input 
                  type="file" 
                  accept="image/*"
                  onChange={e => {
                    if (e.target.files && e.target.files.length > 0) {
                      const file = e.target.files[0];
                      if (file.size > 3 * 1024 * 1024) {
                        toast.error('Image size must be less than 3MB');
                        e.target.value = '';
                        return;
                      }
                      setMobileImageFile(file);
                      setMobileImage('');
                    }
                  }}
                  className="w-full text-[14px] file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-[#f4f1fb] file:text-[#5b3db8] hover:file:bg-[#ece7f8] transition-colors cursor-pointer" 
                />
                {(mobileImage || mobileImageFile) && (
                  <div className="mt-4">
                    <p className="text-[12px] font-semibold text-slate-500 mb-2">Image Preview</p>
                    <img 
                      src={mobileImageFile ? URL.createObjectURL(mobileImageFile) : (mobileImage.startsWith('/') ? `${process.env.NEXT_PUBLIC_BACKEND_URL?.replace('/api', '') || 'http://localhost:5000'}${mobileImage}` : mobileImage)} 
                      alt="Mobile Preview" 
                      className="w-[120px] h-[180px] rounded-lg object-cover border border-slate-200 shadow-sm"
                    />
                  </div>
                )}
              </div>

              {/* Submit Button */}
              <div className="pt-2">
                <button 
                  onClick={handleSubmit}
                  disabled={saving}
                  className={`w-full ${editingId ? 'bg-[#10b981] hover:bg-emerald-600' : 'bg-[#5b3db8] hover:bg-[#4a2f96]'} text-white h-[48px] rounded-[12px] font-bold text-[15px] transition-colors shadow-sm ${saving ? 'opacity-70 cursor-not-allowed' : ''}`}
                >
                  {saving ? 'Saving...' : (editingId ? 'Update Banner' : 'Create Banner')}
                </button>
              </div>
            </div>
          </div>
        )}
        
      </div>

      {/* Delete Confirmation Modal */}
      {deleteModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-[24px] p-8 max-w-[400px] w-full shadow-2xl transform transition-all">
            <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
            </div>
            <h3 className="text-[20px] font-bold text-center text-slate-900 mb-2">Delete Banner?</h3>
            <p className="text-slate-500 text-center text-[15px] mb-8 leading-relaxed">
              Are you sure you want to delete this banner? This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button 
                onClick={() => setDeleteModal({ isOpen: false, bannerId: null })}
                disabled={deleting}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 h-[48px] rounded-[14px] font-bold text-[15px] transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={confirmDelete}
                disabled={deleting}
                className={`flex-1 bg-red-500 hover:bg-red-600 text-white h-[48px] rounded-[14px] font-bold text-[15px] transition-colors shadow-sm shadow-red-500/20 ${deleting ? 'opacity-70 cursor-not-allowed' : ''}`}
              >
                {deleting ? 'Deleting...' : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

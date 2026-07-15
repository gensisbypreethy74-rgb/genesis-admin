'use client';

import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import axios from 'axios';

interface ICategory {
  _id: string;
  name: string;
  image: string;
  status: string;
}

export default function CategoriesPage() {
  const [isAddCategoryOpen, setIsAddCategoryOpen] = useState(false);
  const [categories, setCategories] = useState<ICategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteModal, setDeleteModal] = useState<{isOpen: boolean, categoryId: string | null}>({ isOpen: false, categoryId: null });
  const [deleting, setDeleting] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [image, setImage] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [status, setStatus] = useState('ACTIVE');

  // Fetch Categories
  const fetchCategories = async () => {
    try {
      const res = await axios.get(`${process.env.NEXT_PUBLIC_BACKEND_URL}/v1/categories`);
      const data = res.data;
      if (data.success) {
        setCategories(data.data);
      }
    } catch (err) {
      console.error('Failed to fetch categories', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const openAddForm = () => {
    setEditingId(null);
    setName('');
    setImage('');
    setImageFile(null);
    setPreviewUrl('');
    setStatus('ACTIVE');
    setIsAddCategoryOpen(true);
  };

  const handleEdit = (category: ICategory) => {
    setEditingId(category._id);
    setName(category.name);
    
    const baseUrl = process.env.NEXT_PUBLIC_BACKEND_URL?.replace('/api', '') || 'http://localhost:5000';
    const fullImageUrl = category.image?.startsWith('/uploads/') ? `${baseUrl}${category.image}` : category.image;
    setImage(fullImageUrl || '');
    
    setImageFile(null);
    setPreviewUrl('');
    setStatus(category.status);
    setIsAddCategoryOpen(true);
  };

  const handleSubmit = async () => {
    if (!name) return toast.error('Name is required');
    if (!image && !imageFile && !editingId) return toast.error('Image is required');
    
    setSaving(true);
    const token = localStorage.getItem('adminToken');
    
    const formData = new FormData();
    formData.append('name', name);
    formData.append('status', status);
    if (imageFile) {
      formData.append('imageFile', imageFile);
    } else if (image) {
      formData.append('image', image);
    }

    try {
      const url = editingId 
        ? `${process.env.NEXT_PUBLIC_BACKEND_URL}/v1/categories/${editingId}` 
        : `${process.env.NEXT_PUBLIC_BACKEND_URL}/v1/categories`;
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
        toast.success(editingId ? 'Category updated successfully' : 'Category created successfully');
        setIsAddCategoryOpen(false);
        setEditingId(null);
        fetchCategories();
      } else {
        toast.error(data.message || 'Failed to save category');
      }
    } catch (err) {
      console.error(err);
      toast.error('Error connecting to backend');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteClick = (id: string) => {
    setDeleteModal({ isOpen: true, categoryId: id });
  };

  const confirmDelete = async () => {
    if(!deleteModal.categoryId) return;
    setDeleting(true);
    const token = localStorage.getItem('adminToken');
    try {
      const res = await axios.delete(`${process.env.NEXT_PUBLIC_BACKEND_URL}/v1/categories/${deleteModal.categoryId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = res.data;
      if (data.success) {
        toast.success('Category deleted successfully');
        fetchCategories();
        setDeleteModal({ isOpen: false, categoryId: null });
      } else {
        toast.error(data.message);
      }
    } catch (err) {
      console.error(err);
      toast.error('Error deleting category');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="max-w-[1600px] mx-auto mt-2 pb-12">
      <div className="flex flex-col xl:flex-row gap-6 items-start">
        
        {/* Left Column: Category Catalog */}
        <div className="flex-1 min-w-0 bg-white rounded-[24px] p-6 lg:p-8 shadow-sm border border-slate-100/60 w-full transition-all duration-300">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-[16px] font-medium text-slate-800">Product Categories</h2>
            <button 
              onClick={openAddForm}
              className="bg-[#5b3db8] hover:bg-[#4a2f96] text-white px-6 py-2.5 rounded-[12px] font-medium text-[14px] flex items-center gap-2 transition-colors shadow-sm"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
              Add New Category
            </button>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#f8fafc]">
                  <th className="py-4 px-6 text-[13px] font-semibold text-slate-500 rounded-l-[12px] w-[20%]">Image</th>
                  <th className="py-4 px-6 text-[13px] font-semibold text-slate-500 w-[40%]">Name</th>
                  <th className="py-4 px-6 text-[13px] font-semibold text-slate-500 w-[20%]">Status</th>
                  <th className="py-4 px-6 text-[13px] font-semibold text-slate-500 rounded-r-[12px] w-[20%]">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={4} className="py-8 text-center text-slate-500">Loading categories...</td></tr>
                ) : categories.length === 0 ? (
                  <tr><td colSpan={4} className="py-8 text-center text-slate-500">No categories found. Add your first category!</td></tr>
                ) : categories.map((category) => (
                  <tr key={category._id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50 transition-colors">
                    <td className="py-5 px-6">
                      <img src={(category.image?.startsWith('/uploads/') ? (`${process.env.NEXT_PUBLIC_BACKEND_URL?.replace('/api', '') || 'http://localhost:5000'}${category.image}`) : category.image) || 'https://via.placeholder.com/54'} alt={category.name} className="w-[54px] h-[54px] rounded-[12px] object-cover bg-slate-100 shadow-sm" />
                    </td>
                    <td className="py-5 px-6 text-[15px] font-bold text-[#111827]">{category.name}</td>
                    <td className="py-5 px-6">
                      <span className={`inline-flex items-center justify-center px-3 py-1 rounded-full text-[12px] font-bold tracking-wide ${category.status === 'ACTIVE' ? 'bg-[#dcfce7] text-[#166534]' : 'bg-red-100 text-red-700'}`}>
                        {category.status}
                      </span>
                    </td>
                    <td className="py-5 px-6">
                      <div className="flex items-center gap-3">
                        <button 
                          onClick={() => handleEdit(category)}
                          className="w-[36px] h-[36px] rounded-[10px] bg-[#eff6ff] text-[#5b3db8] hover:bg-[#ece7f8] flex items-center justify-center transition-colors"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                        </button>
                        <button 
                          onClick={() => handleDeleteClick(category._id)}
                          className="w-[36px] h-[36px] rounded-[10px] bg-[#fef2f2] text-[#ef4444] hover:bg-red-100 flex items-center justify-center transition-colors"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Column: Add/Edit Category Form */}
        {isAddCategoryOpen && (
          <div className="w-full xl:w-[420px] shrink-0 bg-white shadow-sm border border-slate-100/60 rounded-[24px] xl:sticky xl:top-[120px] overflow-hidden flex flex-col p-6 lg:p-8 transition-all duration-300">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-[20px] font-bold text-[#111827]">{editingId ? 'Edit Category' : 'Add New Category'}</h2>
              <button 
                onClick={() => { setIsAddCategoryOpen(false); setEditingId(null); }}
                className="w-[32px] h-[32px] rounded-full bg-slate-50 flex items-center justify-center text-slate-500 hover:bg-slate-100 transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              </button>
            </div>

            {/* Form */}
            <div className="space-y-6">
              {/* Category Name */}
              <div>
                <label className="block text-[13px] font-bold text-[#111827] mb-2.5">Category Name</label>
                <input 
                  type="text" 
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full h-[48px] px-4 rounded-[12px] border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#5b3db8]/20 focus:border-[#5b3db8] transition-all text-[14px]" 
                />
              </div>

              {/* Status */}
              <div>
                <label className="block text-[13px] font-bold text-[#111827] mb-2.5">Status</label>
                <div className="relative">
                  <select 
                    value={status}
                    onChange={e => setStatus(e.target.value)}
                    className="w-full h-[48px] px-4 rounded-[12px] border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#5b3db8]/20 focus:border-[#5b3db8] transition-all appearance-none text-[14px] text-slate-700"
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="INACTIVE">INACTIVE</option>
                  </select>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                  </div>
                </div>
              </div>

              {/* Image Upload */}
              <div>
                <label className="block text-[13px] font-bold text-[#111827] mb-2.5">Category Image</label>
                <div className="flex items-center gap-6">
                  <div className="w-[80px] h-[80px] rounded-[16px] border border-slate-200 overflow-hidden shrink-0 bg-slate-50 flex items-center justify-center">
                    {(previewUrl || image) ? (
                      <img src={previewUrl || image} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
                    )}
                  </div>
                  <div className="flex-1">
                    <input 
                      type="file" 
                      accept="image/*"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          const file = e.target.files[0];
                          setImageFile(file);
                          setPreviewUrl(URL.createObjectURL(file));
                        }
                      }}
                      className="w-full text-[14px] file:mr-4 file:py-2.5 file:px-5 file:rounded-[10px] file:border-0 file:text-sm file:font-semibold file:bg-[#eff6ff] file:text-[#5b3db8] hover:file:bg-[#ece7f8] transition-colors cursor-pointer" 
                    />
                    <p className="text-[12px] text-slate-500 mt-2">Recommended: 400x400px. JPG, PNG, WEBP.</p>
                  </div>
                </div>
              </div>

              {/* Create/Update Button */}
              <div className="pt-2">
                <button 
                  onClick={handleSubmit}
                  disabled={saving}
                  className={`w-full ${editingId ? 'bg-[#10b981] hover:bg-emerald-600' : 'bg-[#5b3db8] hover:bg-[#4a2f96]'} text-white h-[48px] rounded-[12px] font-bold text-[15px] transition-colors shadow-sm ${saving ? 'opacity-70 cursor-not-allowed' : ''}`}
                >
                  {saving ? 'Saving...' : (editingId ? 'Update Category' : 'Create Category')}
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
            <h3 className="text-[20px] font-bold text-center text-slate-900 mb-2">Delete Category?</h3>
            <p className="text-slate-500 text-center text-[15px] mb-8 leading-relaxed">
              Are you sure you want to delete this category? All associated products may be affected.
            </p>
            <div className="flex gap-3">
              <button 
                onClick={() => setDeleteModal({ isOpen: false, categoryId: null })}
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

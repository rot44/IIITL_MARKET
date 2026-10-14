import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  ArrowLeft,
  Trash2,
  UploadCloud,
  CheckCircle2,
  MapPin,
  AlertCircle
} from 'lucide-react';
import { listingsApi } from '../lib/api';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../contexts/AuthContext';

const CONDITIONS = [
  { value: 'New', title: 'Brand New', desc: 'Unused in original box' },
  { value: 'Like New', title: 'Like New', desc: 'Barely used, zero scratches' },
  { value: 'Good', title: 'Good', desc: 'Minor normal use, 100% working' },
  { value: 'Fair', title: 'Fair', desc: 'Noticeable wear, fully functional' },
  { value: 'Poor', title: 'Poor', desc: 'Heavy wear or needs minor repair' },
];

const DEFAULT_CATEGORIES = [
  { id: 1, name: 'Books' },
  { id: 2, name: 'Electronics' },
  { id: 3, name: 'Stationary' },
  { id: 4, name: 'Sports' },
  { id: 5, name: 'Clothing' },
  { id: 6, name: 'Daily-use' },
  { id: 7, name: 'Hostel Essentials' },
  { id: 8, name: 'Others' },
];

const HOSTEL_LOCATIONS = [
  'BH-1 (Boys Hostel 1)',
  'BH-2 (Boys Hostel 2)',
  'GH (Girls Hostel)',
  'Academic Block (Ground Floor)',
  'Campus Canteen',
  'Main Gate'
];

export default function EditListing() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [categories, setCategories] = useState(DEFAULT_CATEGORIES);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    price: '',
    category_id: '',
    condition: 'Good',
    location: '',
    is_negotiable: false,
    is_sold: false,
    tagInput: '',
    tags: [],
  });

  const [images, setImages] = useState([]);
  const [uploadingImage, setUploadingImage] = useState(false);

  useEffect(() => {
    const init = async () => {
      try {
        const [catRes, listRes] = await Promise.all([
          listingsApi.getCategories().catch(() => ({ data: DEFAULT_CATEGORIES })),
          listingsApi.getById(id)
        ]);

        if (catRes.data?.length) {
          setCategories(catRes.data);
        }

        const l = listRes.data;
        if (!l) throw new Error('Listing not found');

        if (user && l.seller_id !== user.id) {
          toast.error('You are not authorized to edit this listing.');
          navigate(`/listing/${id}`);
          return;
        }

        setFormData({
          title: l.title || '',
          description: l.description || '',
          price: l.price || '',
          category_id: l.category_id || catRes.data?.[0]?.id || 1,
          condition: l.condition || 'Good',
          location: l.location || '',
          is_negotiable: !!l.is_negotiable,
          is_sold: !!l.is_sold,
          tagInput: '',
          tags: Array.isArray(l.tags) ? l.tags : [],
        });

        setImages(Array.isArray(l.images) ? l.images : []);
      } catch (err) {
        console.error('Error fetching listing:', err);
        navigate('/home');
      } finally {
        setLoading(false);
      }
    };

    if (id) init();
  }, [id, user, navigate]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleAddTag = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const tag = formData.tagInput.trim().replace(/^#/, '');
      if (tag && !formData.tags.includes(tag)) {
        setFormData(prev => ({
          ...prev,
          tags: [...prev.tags, tag],
          tagInput: ''
        }));
      }
    }
  };

  const handleRemoveTag = (tagToRemove) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(t => t !== tagToRemove)
    }));
  };

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;

    if (images.length + files.length > 5) {
      toast.warning('Maximum 5 images allowed per listing.');
      return;
    }

    setUploadingImage(true);
    const newUrls = [];

    for (const file of files) {
      try {
        if (file.size > 5 * 1024 * 1024) {
          toast.error(`${file.name} is too large (max 5MB)`);
          continue;
        }

        const fileExt = file.name.split('.').pop();
        const fileName = `${user?.id || 'anon'}_${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('listing-images')
          .upload(filePath, file);

        if (uploadError) {
          const localUrl = URL.createObjectURL(file);
          newUrls.push(localUrl);
        } else {
          const { data } = supabase.storage
            .from('listing-images')
            .getPublicUrl(filePath);
          if (data?.publicUrl) {
            newUrls.push(data.publicUrl);
          }
        }
      } catch (err) {
        console.error('File upload error:', err);
      }
    }

    if (newUrls.length > 0) {
      setImages(prev => [...prev, ...newUrls]);
      toast.success(`${newUrls.length} image(s) attached.`);
    }
    setUploadingImage(false);
    e.target.value = '';
  };

  const handleRemoveImage = (index) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.title.trim()) {
      return toast.error('Please enter a listing title.');
    }
    if (!formData.price || parseFloat(formData.price) <= 0) {
      return toast.error('Please enter a valid price in INR.');
    }

    setSaving(true);
    try {
      const payload = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        price: parseFloat(formData.price),
        category_id: parseInt(formData.category_id),
        condition: formData.condition,
        images: images,
        is_negotiable: formData.is_negotiable,
        is_sold: formData.is_sold,
        location: formData.location.trim() || 'IIIT Lucknow Campus',
        tags: formData.tags
      };

      await listingsApi.update(id, payload);
      toast.success('Listing updated successfully!');
      navigate(`/listing/${id}`);
    } catch (err) {
      console.error('Update listing error:', err);
      toast.error(err.response?.data?.error || 'Failed to update listing.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this listing permanently? This cannot be undone.')) {
      return;
    }

    setDeleting(true);
    try {
      await listingsApi.delete(id);
      toast.success('Listing removed.');
      navigate('/profile');
    } catch (err) {
      console.error('Delete error:', err);
      toast.error('Failed to delete listing.');
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '100px 0' }}>
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div className="container" style={{ paddingTop: '28px', paddingBottom: '80px', maxWidth: '800px' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="ui-btn ui-btn-ghost ui-btn-sm"
            style={{ paddingLeft: 0, marginBottom: '8px' }}
          >
            <ArrowLeft size={16} />
            <span>Back</span>
          </button>
          <h1 style={{ fontSize: '1.75rem', color: 'var(--brand-navy)' }}>Edit Listing</h1>
        </div>

        <button
          type="button"
          onClick={handleDelete}
          className="ui-btn ui-btn-danger ui-btn-sm"
          disabled={deleting}
        >
          <Trash2 size={15} />
          <span>{deleting ? 'Deleting...' : 'Delete Listing'}</span>
        </button>
      </div>

      <form onSubmit={handleSubmit}>
        
        {/* Core Card */}
        <div className="ui-card" style={{ padding: '28px', marginBottom: '24px' }}>
          
          {/* Status Alert if sold */}
          {formData.is_sold && (
            <div className="ui-alert ui-alert-warning" style={{ marginBottom: '20px' }}>
              <AlertCircle size={18} />
              <div>
                <strong>Marked as Sold:</strong> This item is currently hidden from active marketplace search. Uncheck below to reactivate it.
              </div>
            </div>
          )}

          {/* Mark as sold checkbox */}
          <div style={{
            padding: '14px 16px',
            background: 'var(--color-subtle)',
            border: '1px solid var(--border-default)',
            borderRadius: 'var(--radius)',
            marginBottom: '20px'
          }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '0.875rem' }}>
              <input
                type="checkbox"
                name="is_sold"
                checked={formData.is_sold}
                onChange={handleChange}
                style={{ accentColor: 'var(--brand-green)', width: '18px', height: '18px', cursor: 'pointer' }}
              />
              <div>
                <span style={{ fontWeight: 700, color: 'var(--text-title)' }}>Item has been sold</span>
                <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Check this when you complete the deal with a classmate.
                </span>
              </div>
            </label>
          </div>

          {/* Title */}
          <div className="ui-form-group">
            <label className="ui-label" htmlFor="title">
              Item Title <span style={{ color: 'var(--brand-red)' }}>*</span>
            </label>
            <input
              id="title"
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              className="ui-input"
              maxLength={100}
              required
            />
          </div>

          {/* Category & Price */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '18px' }}>
            <div>
              <label className="ui-label">
                Category <span style={{ color: 'var(--brand-red)' }}>*</span>
              </label>
              <select
                name="category_id"
                value={formData.category_id}
                onChange={handleChange}
                className="ui-select"
                required
              >
                {categories.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="ui-label">
                Price (₹ INR) <span style={{ color: 'var(--brand-red)' }}>*</span>
              </label>
              <div className="ui-input-wrapper">
                <span className="ui-input-icon" style={{ fontWeight: 700 }}>₹</span>
                <input
                  type="number"
                  name="price"
                  value={formData.price}
                  onChange={handleChange}
                  min="1"
                  className="ui-input"
                  required
                />
              </div>
            </div>
          </div>

          {/* Price Negotiable Toggle */}
          <div style={{ marginBottom: '22px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.875rem' }}>
              <input
                type="checkbox"
                name="is_negotiable"
                checked={formData.is_negotiable}
                onChange={handleChange}
                style={{ accentColor: 'var(--brand-blue)', width: '16px', height: '16px', cursor: 'pointer' }}
              />
              <span style={{ color: 'var(--text-body)', fontWeight: 500 }}>
                Price is open to reasonable negotiation
              </span>
            </label>
          </div>

          {/* Condition Cards */}
          <div className="ui-form-group">
            <label className="ui-label">
              Condition <span style={{ color: 'var(--brand-red)' }}>*</span>
            </label>
            <div className="condition-grid">
              {CONDITIONS.map(c => {
                const isSelected = formData.condition === c.value;
                return (
                  <div
                    key={c.value}
                    onClick={() => setFormData(prev => ({ ...prev, condition: c.value }))}
                    className={`condition-card ${isSelected ? 'active' : ''}`}
                  >
                    <div className="condition-card-title">{c.title}</div>
                    <div className="condition-card-desc">{c.desc}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Campus Meetup Location */}
          <div className="ui-form-group">
            <label className="ui-label">Campus Pickup Location</label>
            <div className="ui-input-wrapper" style={{ marginBottom: '8px' }}>
              <MapPin size={16} className="ui-input-icon" />
              <input
                type="text"
                name="location"
                value={formData.location}
                onChange={handleChange}
                className="ui-input"
              />
            </div>
            
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {HOSTEL_LOCATIONS.map(loc => (
                <button
                  key={loc}
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, location: loc }))}
                  className="ui-btn ui-btn-ghost ui-btn-sm"
                  style={{
                    fontSize: '0.75rem',
                    padding: '3px 8px',
                    background: 'var(--color-subtle)',
                    border: '1px solid var(--border-default)'
                  }}
                >
                  + {loc}
                </button>
              ))}
            </div>
          </div>

          {/* Description */}
          <div className="ui-form-group">
            <label className="ui-label">Description & Usage Notes</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              className="ui-textarea"
              rows={4}
            />
          </div>

          {/* Search Tags */}
          <div className="ui-form-group" style={{ marginBottom: 0 }}>
            <label className="ui-label">Keywords / Tags</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                name="tagInput"
                value={formData.tagInput}
                onChange={handleChange}
                onKeyDown={handleAddTag}
                placeholder="Type tag and press Enter"
                className="ui-input"
                style={{ flex: 1 }}
              />
              <button
                type="button"
                onClick={() => handleAddTag({ key: 'Enter', preventDefault: () => {} })}
                className="ui-btn ui-btn-secondary ui-btn-sm"
              >
                Add
              </button>
            </div>

            {formData.tags.length > 0 && (
              <div className="tag-chip-row">
                {formData.tags.map(t => (
                  <span key={t} className="tag-chip">
                    #{t}
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(t)}
                      className="tag-chip-delete"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* Photos Card */}
        <div className="ui-card" style={{ padding: '28px', marginBottom: '28px' }}>
          <h2 style={{ fontSize: '1.1rem', color: 'var(--brand-navy)', marginBottom: '4px' }}>
            Photos ({images.length}/5)
          </h2>

          <div className="image-upload-dropzone">
            <input
              type="file"
              id="file-upload"
              multiple
              accept="image/*"
              onChange={handleFileUpload}
              style={{ display: 'none' }}
              disabled={uploadingImage || images.length >= 5}
            />
            <label
              htmlFor="file-upload"
              className="ui-btn ui-btn-secondary ui-btn-sm"
              style={{ cursor: (uploadingImage || images.length >= 5) ? 'not-allowed' : 'pointer' }}
            >
              <UploadCloud size={16} />
              <span>{uploadingImage ? 'Uploading...' : 'Add More Photos'}</span>
            </label>
          </div>

          {images.length > 0 && (
            <div className="image-preview-grid">
              {images.map((img, idx) => (
                <div key={idx} className="image-preview-item">
                  <img src={img} alt={`Item ${idx + 1}`} />
                  <button
                    type="button"
                    onClick={() => handleRemoveImage(idx)}
                    className="image-preview-remove"
                    title="Remove photo"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="ui-btn ui-btn-secondary ui-btn-lg"
            disabled={saving}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="ui-btn ui-btn-primary ui-btn-lg"
            disabled={saving}
            style={{ minWidth: '180px' }}
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>

      </form>

    </div>
  );
}

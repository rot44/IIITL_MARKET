import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  UploadCloud,
  Image as ImageIcon,
  ArrowLeft,
  MapPin,
  Tag,
  CheckCircle2,
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

export default function SellItem() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [categories, setCategories] = useState(DEFAULT_CATEGORIES);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    price: '',
    category_id: '',
    condition: 'Good',
    location: '',
    is_negotiable: false,
    tagInput: '',
    tags: [],
  });

  const [images, setImages] = useState([]);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    listingsApi.getCategories()
      .then(res => {
        if (res.data?.length > 0) {
          setCategories(res.data);
          setFormData(prev => ({ ...prev, category_id: res.data[0].id }));
        } else {
          setFormData(prev => ({ ...prev, category_id: DEFAULT_CATEGORIES[0].id }));
        }
      })
      .catch(() => {
        setFormData(prev => ({ ...prev, category_id: DEFAULT_CATEGORIES[0].id }));
      });
  }, []);

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

    setSubmitting(true);
    try {
      const payload = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        price: parseFloat(formData.price),
        category_id: parseInt(formData.category_id),
        condition: formData.condition,
        images: images,
        is_negotiable: formData.is_negotiable,
        location: formData.location.trim() || 'IIIT Lucknow Campus',
        tags: formData.tags
      };

      const res = await listingsApi.create(payload);
      toast.success('Listing published successfully!');
      const newId = res.data?.listing?.id;
      navigate(newId ? `/listing/${newId}` : '/home');
    } catch (err) {
      console.error('Create listing error:', err);
      toast.error(err.response?.data?.error || 'Failed to create listing.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="container" style={{ paddingTop: '28px', paddingBottom: '80px', maxWidth: '800px' }}>
      
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="ui-btn ui-btn-ghost ui-btn-sm"
          style={{ paddingLeft: 0, marginBottom: '8px' }}
        >
          <ArrowLeft size={16} />
          <span>Back</span>
        </button>
        <h1 style={{ fontSize: '1.75rem', color: 'var(--brand-navy)' }}>Post an Item for Sale</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '4px' }}>
          Listings are visible immediately to all verified @iiitl.ac.in classmates.
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        
        {/* Core Information Card */}
        <div className="ui-card" style={{ padding: '28px', marginBottom: '24px' }}>
          
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
              placeholder="e.g. Casio fx-991EX Classwiz Calculator, Mint Condition"
              className="ui-input"
              maxLength={100}
              required
            />
            <div className="ui-help-text">
              <span>Include brand, model, and edition</span>
              <span>{formData.title.length}/100</span>
            </div>
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
                  placeholder="350"
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
                placeholder="e.g. BH-1 Room 214 or Academic Block Canteen"
                className="ui-input"
              />
            </div>
            
            {/* Quick Suggestions */}
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
              placeholder="State how long you've used it, included cables or manuals, and reason for selling..."
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
                placeholder="Type tag (e.g. sem3, textbook, casio) and press Enter"
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
            Item Photos ({images.length}/5)
          </h2>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
            Clear photos of the actual item sell significantly faster.
          </p>

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
              <span>{uploadingImage ? 'Uploading...' : 'Select Photos from Device'}</span>
            </label>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '8px' }}>
              JPG, PNG, WebP up to 5MB each.
            </div>
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
            disabled={submitting}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="ui-btn ui-btn-primary ui-btn-lg"
            disabled={submitting}
            style={{ minWidth: '180px' }}
          >
            {submitting ? 'Publishing...' : 'Publish Listing'}
          </button>
        </div>

      </form>

    </div>
  );
}

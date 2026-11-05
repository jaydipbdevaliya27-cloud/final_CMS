import MasterData from '../models/MasterData.js';

// Escape regex special characters
const escapeRegex = (str) => {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

// Auto-save helper: adds new entry if it doesn't exist
// Automatically splits comma-separated values for complaints and investigations
// so composite strings are never stored into Master Data
export const autoSaveMasterItem = async (type, value, shortcut = '') => {
  if (!value || typeof value !== 'string') return;
  // Dietary items are temporary print/prescription advice only and must never be auto-saved to Master Data
  if (!type || type === 'dietary') return;
  const trimmed = value.trim();
  if (!trimmed) return;

  // If multiple items are separated by comma, process each individual word/term
  if ((type === 'complaint' || type === 'investigation') && trimmed.includes(',')) {
    const tokens = trimmed.split(',').map((t) => t.trim()).filter(Boolean);
    for (const token of tokens) {
      await autoSaveMasterItem(type, token, shortcut);
    }
    return;
  }

  try {
    const existing = await MasterData.findOne({
      type,
      value: { $regex: new RegExp(`^${escapeRegex(trimmed)}$`, 'i') },
    });
    if (!existing) {
      await MasterData.create({
        type,
        value: trimmed,
        shortcut: shortcut ? shortcut.trim().toUpperCase() : '',
      });
    }
  } catch (err) {
    if (err.code !== 11000) {
      console.error(`Error auto-saving master data [${type}]:`, err.message);
    }
  }
};

// Clean up any legacy composite entries with commas in Master Data
export const cleanupCompositeMasterData = async () => {
  try {
    const compositeItems = await MasterData.find({
      type: { $in: ['complaint', 'investigation'] },
      value: { $regex: /,/ },
    });
    for (const item of compositeItems) {
      const parts = item.value.split(',').map((p) => p.trim()).filter(Boolean);
      for (const part of parts) {
        await autoSaveMasterItem(item.type, part);
      }
      await MasterData.findByIdAndDelete(item._id);
    }
    if (compositeItems.length > 0) {
      console.log(`[Master Data] Cleaned up ${compositeItems.length} composite items.`);
    }

    // Seed default clinical dietary suggestions if none exist
    const dietaryCount = await MasterData.countDocuments({ type: 'dietary' });
    if (dietaryCount === 0) {
      const defaultDietary = [
        { value: 'Light & easily digestible diet (Khichdi, Soup, Dalia)', shortcut: 'DIET-LIGHT' },
        { value: 'Strict diabetic diet (Avoid sugar, sweets, potatoes, rice)', shortcut: 'DIET-DIAB' },
        { value: 'Low salt diet - Avoid papad, pickles, processed snacks (BP Care)', shortcut: 'DIET-BP' },
        { value: 'Avoid spicy, sour, oily & fried foods (Acidity / Gastritis Care)', shortcut: 'DIET-ACID' },
        { value: 'Drink plenty of boiled warm water (2-3 Litres daily)', shortcut: 'DIET-WATER' },
        { value: 'High fiber diet - Green leafy vegetables, salads & fresh fruits', shortcut: 'DIET-FIBER' },
        { value: 'Avoid cold beverages, refrigerated items & ice', shortcut: 'DIET-COLD' },
        { value: 'Soft bland diet with adequate oral hydration (ORS / Liquids)', shortcut: 'DIET-ORS' },
      ];
      for (const d of defaultDietary) {
        await MasterData.create({
          type: 'dietary',
          value: d.value,
          shortcut: d.shortcut,
        });
      }
      console.log('[Master Data] Seeded default clinical dietary advice items.');
    }
  } catch (e) {
    console.error('Error cleaning composite master data:', e.message);
  }
};

// @desc    Get Master Data items with pagination & search
// @route   GET /api/master-data
// @access  Private (Doctor)
export const getMasterItems = async (req, res) => {
  try {
    const { type, search } = req.query;
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.max(1, parseInt(req.query.limit) || 10);
    const skip = (page - 1) * limit;

    const query = {};

    if (type) {
      query.type = type;
    }

    if (search && search.trim()) {
      const regex = new RegExp(search.trim(), 'i');
      query.$or = [
        { value: regex },
        { shortcut: regex },
      ];
    }

    const total = await MasterData.countDocuments(query);
    let items = await MasterData.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    if (search && search.trim()) {
      const term = search.trim().toUpperCase();
      items.sort((a, b) => {
        const aShort = (a.shortcut || '').toUpperCase();
        const bShort = (b.shortcut || '').toUpperCase();
        const aVal = (a.value || '').toUpperCase();
        const bVal = (b.value || '').toUpperCase();

        const aExact = aShort === term ? 0 : 1;
        const bExact = bShort === term ? 0 : 1;
        if (aExact !== bExact) return aExact - bExact;

        const aShortStarts = aShort.startsWith(term) ? 0 : 1;
        const bShortStarts = bShort.startsWith(term) ? 0 : 1;
        if (aShortStarts !== bShortStarts) return aShortStarts - bShortStarts;

        const aValStarts = aVal.startsWith(term) ? 0 : 1;
        const bValStarts = bVal.startsWith(term) ? 0 : 1;
        if (aValStarts !== bValStarts) return aValStarts - bValStarts;

        return 0;
      });
    }

    return res.status(200).json({
      success: true,
      count: items.length,
      total,
      page,
      totalPages: Math.ceil(total / limit) || 1,
      data: items,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve master data',
      error: error.message,
    });
  }
};

// @desc    Create new Master Data item
// @route   POST /api/master-data
// @access  Private
export const addMasterItem = async (req, res) => {
  try {
    const { type, value, shortcut } = req.body;

    if (!type || !value) {
      return res.status(400).json({
        success: false,
        message: 'Category type and name/value are required',
      });
    }

    const trimmedValue = value.trim();
    const trimmedShortcut = shortcut ? shortcut.trim().toUpperCase() : '';

    const existing = await MasterData.findOne({
      type,
      value: { $regex: new RegExp(`^${trimmedValue}$`, 'i') },
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        message: `"${trimmedValue}" already exists under ${type}`,
        item: existing,
      });
    }

    const newItem = await MasterData.create({
      type,
      value: trimmedValue,
      shortcut: trimmedShortcut,
    });

    return res.status(201).json({
      success: true,
      message: 'Master item added successfully',
      data: newItem,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to add master item',
      error: error.message,
    });
  }
};

// @desc    Update Master Data item
// @route   PUT /api/master-data/:id
// @access  Private
export const updateMasterItem = async (req, res) => {
  try {
    const { value, shortcut } = req.body;
    const item = await MasterData.findById(req.params.id);

    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Master item not found',
      });
    }

    if (value && value.trim()) {
      item.value = value.trim();
    }
    if (shortcut !== undefined) {
      item.shortcut = shortcut.trim().toUpperCase();
    }

    await item.save();

    return res.status(200).json({
      success: true,
      message: 'Master item updated successfully',
      data: item,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to update master item',
      error: error.message,
    });
  }
};

// @desc    Delete Master Data item
// @route   DELETE /api/master-data/:id
// @access  Private
export const deleteMasterItem = async (req, res) => {
  try {
    const item = await MasterData.findByIdAndDelete(req.params.id);

    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Master item not found',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Master item deleted successfully',
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to delete master item',
      error: error.message,
    });
  }
};

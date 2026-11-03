import Visit from '../models/Visit.js';
import Patient from '../models/Patient.js';
import Family from '../models/Family.js';
import Certificate from '../models/Certificate.js';

// 1. AREA-WISE REPORT
// @route   GET /api/reports/area-wise
// @access  Private
export const getAreaWiseReport = async (req, res) => {
  try {
    const { area, startDate, endDate } = req.query;

    // Filter patients by area if specified
    const patientQuery = {};
    if (area && area.trim()) {
      patientQuery.area = new RegExp(area.trim(), 'i');
    }

    const patients = await Patient.find(patientQuery).lean();
    const patientMap = {};
    patients.forEach((p) => {
      patientMap[p.patientId] = p;
    });

    const patientIds = Object.keys(patientMap);

    // Build visit query
    const visitQuery = { patientId: { $in: patientIds } };
    if (startDate && endDate) {
      visitQuery.visitDate = { $gte: startDate, $lte: endDate };
    } else if (startDate) {
      visitQuery.visitDate = { $gte: startDate };
    } else if (endDate) {
      visitQuery.visitDate = { $lte: endDate };
    }

    const visits = await Visit.find(visitQuery).sort({ visitDate: -1 }).lean();

    // Group visits & patients by Area
    const areaStats = {};
    let grandCharge = 0;
    let grandReceived = 0;
    let grandDue = 0;

    // Also include patients who have an area even if no visits in date range
    patients.forEach((p) => {
      const pArea = (p.area || 'Unknown Area').trim().toUpperCase();
      if (!areaStats[pArea]) {
        areaStats[pArea] = {
          area: pArea,
          patientIds: new Set(),
          visitCount: 0,
          totalCharge: 0,
          totalReceived: 0,
          totalDue: 0,
          visits: [],
        };
      }
      areaStats[pArea].patientIds.add(p.patientId);
    });

    visits.forEach((v) => {
      const p = patientMap[v.patientId];
      const pArea = (p?.area || 'Unknown Area').trim().toUpperCase();

      if (!areaStats[pArea]) {
        areaStats[pArea] = {
          area: pArea,
          patientIds: new Set(),
          visitCount: 0,
          totalCharge: 0,
          totalReceived: 0,
          totalDue: 0,
          visits: [],
        };
      }

      areaStats[pArea].patientIds.add(v.patientId);
      areaStats[pArea].visitCount += 1;
      areaStats[pArea].totalCharge += v.charge || 0;
      areaStats[pArea].totalReceived += v.received || 0;
      areaStats[pArea].totalDue += v.due || 0;

      grandCharge += v.charge || 0;
      grandReceived += v.received || 0;
      grandDue += v.due || 0;

      areaStats[pArea].visits.push({
        ...v,
        society: p?.society || '',
        phone: p?.phone || '',
      });
    });

    const reportList = Object.values(areaStats).map((a) => ({
      area: a.area,
      patientsCount: a.patientIds.size,
      visitCount: a.visitCount,
      totalCharge: a.totalCharge,
      totalReceived: a.totalReceived,
      totalDue: a.totalDue,
      visits: a.visits,
    }));

    reportList.sort((a, b) => b.totalCharge - a.totalCharge);

    return res.status(200).json({
      success: true,
      summary: {
        totalAreas: reportList.length,
        totalPatients: patients.length,
        totalVisits: visits.length,
        totalCharge: grandCharge,
        totalReceived: grandReceived,
        totalDue: grandDue,
      },
      data: reportList,
    });
  } catch (error) {
    console.error('Area report error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to generate area-wise report',
      error: error.message,
    });
  }
};

// 2. REF. DOCTOR REPORT
// @route   GET /api/reports/ref-doctor
// @access  Private
export const getRefDoctorReport = async (req, res) => {
  try {
    const { reference, startDate, endDate, minCharge } = req.query;

    const query = {};
    if (reference && reference.trim()) {
      query.reference = new RegExp(reference.trim(), 'i');
    }

    if (startDate && endDate) {
      query.visitDate = { $gte: startDate, $lte: endDate };
    } else if (startDate) {
      query.visitDate = { $gte: startDate };
    } else if (endDate) {
      query.visitDate = { $lte: endDate };
    }

    if (minCharge) {
      query.charge = { $gte: Number(minCharge) || 0 };
    }

    const visits = await Visit.find(query).sort({ visitDate: -1 }).lean();

    // Group visits by Reference
    const refStats = {};
    let grandCharge = 0;
    let grandReceived = 0;
    let grandDue = 0;

    visits.forEach((v) => {
      const refDoc = (v.reference || 'Direct / Self').trim().toUpperCase();
      if (!refStats[refDoc]) {
        refStats[refDoc] = {
          refDoctor: refDoc,
          patientIds: new Set(),
          visitCount: 0,
          totalCharge: 0,
          totalReceived: 0,
          totalDue: 0,
          visits: [],
        };
      }

      refStats[refDoc].patientIds.add(v.patientId);
      refStats[refDoc].visitCount += 1;
      refStats[refDoc].totalCharge += v.charge || 0;
      refStats[refDoc].totalReceived += v.received || 0;
      refStats[refDoc].totalDue += v.due || 0;

      grandCharge += v.charge || 0;
      grandReceived += v.received || 0;
      grandDue += v.due || 0;

      refStats[refDoc].visits.push(v);
    });

    const reportList = Object.values(refStats).map((r) => ({
      refDoctor: r.refDoctor,
      patientsCount: r.patientIds.size,
      visitCount: r.visitCount,
      totalCharge: r.totalCharge,
      totalReceived: r.totalReceived,
      totalDue: r.totalDue,
      visits: r.visits,
    }));

    reportList.sort((a, b) => b.totalCharge - a.totalCharge);

    return res.status(200).json({
      success: true,
      summary: {
        totalDoctors: reportList.length,
        totalVisits: visits.length,
        totalCharge: grandCharge,
        totalReceived: grandReceived,
        totalDue: grandDue,
      },
      data: reportList,
    });
  } catch (error) {
    console.error('Ref doctor report error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to generate ref doctor report',
      error: error.message,
    });
  }
};

// 3. PATIENT HISTORY REPORT
// @route   GET /api/reports/patient-history
// @access  Private
export const getPatientHistoryReport = async (req, res) => {
  try {
    const { search, patientId, startDate, endDate, complaint, hasDue } = req.query;
    const query = {};

    if (patientId && patientId.trim()) {
      query.patientId = patientId.trim();
    }

    if (search && search.trim()) {
      const regex = new RegExp(search.trim(), 'i');
      query.$or = [
        { patientName: regex },
        { patientId: regex },
        { familyId: regex },
        { complaint: regex },
      ];
    }

    if (complaint && complaint.trim()) {
      query.complaint = new RegExp(complaint.trim(), 'i');
    }

    if (startDate && endDate) {
      query.visitDate = { $gte: startDate, $lte: endDate };
    } else if (startDate) {
      query.visitDate = { $gte: startDate };
    } else if (endDate) {
      query.visitDate = { $lte: endDate };
    }

    if (hasDue === 'true' || hasDue === true) {
      query.due = { $gt: 0 };
    }

    const visits = await Visit.find(query).sort({ visitDate: -1, createdAt: -1 }).lean();

    // Populate patient details
    const patientIds = [...new Set(visits.map((v) => v.patientId))];
    const patients = await Patient.find({ patientId: { $in: patientIds } }).lean();
    const patientMap = {};
    patients.forEach((p) => {
      patientMap[p.patientId] = p;
    });

    let totalCharge = 0;
    let totalReceived = 0;
    let totalDue = 0;

    const enrichedVisits = visits.map((v) => {
      totalCharge += v.charge || 0;
      totalReceived += v.received || 0;
      totalDue += v.due || 0;
      const pat = patientMap[v.patientId];
      return {
        ...v,
        patientAge: pat?.age || '',
        patientGender: pat?.gender || '',
        bloodGroup: pat?.bloodGroup || '',
        area: pat?.area || '',
        society: pat?.society || '',
        phone: pat?.phone || '',
      };
    });

    return res.status(200).json({
      success: true,
      summary: {
        totalVisits: enrichedVisits.length,
        uniquePatients: patientIds.length,
        totalCharge,
        totalReceived,
        totalDue,
      },
      data: enrichedVisits,
    });
  } catch (error) {
    console.error('Patient history report error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to generate patient history report',
      error: error.message,
    });
  }
};

// 4. DAILY COLLECTIONS REPORT
// @route   GET /api/reports/daily-collections
// @access  Private
export const getDailyCollectionsReport = async (req, res) => {
  try {
    const { date, startDate, endDate, status } = req.query;
    const query = {};

    if (startDate && endDate) {
      query.visitDate = { $gte: startDate, $lte: endDate };
    } else if (date) {
      query.visitDate = date;
    } else {
      // Default to today
      query.visitDate = new Date().toISOString().split('T')[0];
    }

    if (status === 'paid') {
      query.due = 0;
    } else if (status === 'due') {
      query.due = { $gt: 0 };
    }

    const visits = await Visit.find(query).sort({ createdAt: -1 }).lean();

    let totalCharge = 0;
    let totalReceived = 0;
    let totalDue = 0;

    visits.forEach((v) => {
      totalCharge += v.charge || 0;
      totalReceived += v.received || 0;
      totalDue += v.due || 0;
    });

    return res.status(200).json({
      success: true,
      queryDate: query.visitDate,
      summary: {
        totalTransactions: visits.length,
        totalCharge,
        totalReceived,
        totalDue,
        collectionRate:
          totalCharge > 0 ? Math.round((totalReceived / totalCharge) * 100) : 100,
      },
      data: visits,
    });
  } catch (error) {
    console.error('Daily collections error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to generate daily collections report',
      error: error.message,
    });
  }
};

// 5. MONTHLY INCOME REPORT
// @route   GET /api/reports/monthly-income
// @access  Private
export const getMonthlyIncomeReport = async (req, res) => {
  try {
    const { year = new Date().getFullYear(), month } = req.query;

    const startStr = `${year}-01-01`;
    const endStr = `${year}-12-31`;

    const visits = await Visit.find({
      visitDate: { $gte: startStr, $lte: endStr },
    })
      .sort({ visitDate: 1 })
      .lean();

    const monthNames = [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December',
    ];

    // Initialize all 12 months for current year
    const monthlyData = {};
    for (let i = 1; i <= 12; i++) {
      const mStr = String(i).padStart(2, '0');
      monthlyData[mStr] = {
        monthKey: `${year}-${mStr}`,
        monthNum: i,
        monthName: monthNames[i - 1],
        year: Number(year),
        visitsCount: 0,
        totalCharge: 0,
        totalReceived: 0,
        totalDue: 0,
      };
    }

    let grandCharge = 0;
    let grandReceived = 0;
    let grandDue = 0;

    visits.forEach((v) => {
      const vMonth = v.visitDate ? v.visitDate.split('-')[1] : null;
      if (vMonth && monthlyData[vMonth]) {
        monthlyData[vMonth].visitsCount += 1;
        monthlyData[vMonth].totalCharge += v.charge || 0;
        monthlyData[vMonth].totalReceived += v.received || 0;
        monthlyData[vMonth].totalDue += v.due || 0;

        grandCharge += v.charge || 0;
        grandReceived += v.received || 0;
        grandDue += v.due || 0;
      }
    });

    let monthsList = Object.values(monthlyData);
    if (month) {
      const targetM = String(Number(month)).padStart(2, '0');
      monthsList = monthsList.filter((m) => m.monthNum === Number(month));
    }

    return res.status(200).json({
      success: true,
      year: Number(year),
      summary: {
        totalVisits: visits.length,
        totalCharge: grandCharge,
        totalReceived: grandReceived,
        totalDue: grandDue,
        averagePerMonth: Math.round(grandReceived / 12),
      },
      data: monthsList,
    });
  } catch (error) {
    console.error('Monthly income report error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to generate monthly income report',
      error: error.message,
    });
  }
};

// 6. DUE REPORT (PATIENTS & FAMILIES OUTSTANDING BALANCES)
// @route   GET /api/reports/dues
// @access  Private
export const getDueReport = async (req, res) => {
  try {
    const { search, minDue = 0, area } = req.query;

    const patientQuery = { totalDue: { $gt: Number(minDue) || 0 } };

    if (search && search.trim()) {
      const regex = new RegExp(search.trim(), 'i');
      patientQuery.$or = [
        { name: regex },
        { patientId: regex },
        { familyId: regex },
        { phone: regex },
      ];
    }

    if (area && area.trim()) {
      patientQuery.area = new RegExp(area.trim(), 'i');
    }

    const patientsWithDue = await Patient.find(patientQuery)
      .sort({ totalDue: -1 })
      .lean();

    // Attach family info & last visit date
    const familyIds = [...new Set(patientsWithDue.map((p) => p.familyId))];
    const families = await Family.find({ familyId: { $in: familyIds } }).lean();
    const familyMap = {};
    families.forEach((f) => {
      familyMap[f.familyId] = f;
    });

    const patientIds = patientsWithDue.map((p) => p.patientId);
    const lastVisits = await Visit.find({ patientId: { $in: patientIds } })
      .sort({ visitDate: -1 })
      .lean();

    const lastVisitMap = {};
    lastVisits.forEach((v) => {
      if (!lastVisitMap[v.patientId]) {
        lastVisitMap[v.patientId] = v.visitDate;
      }
    });

    let totalOutstanding = 0;
    const reportData = patientsWithDue.map((p) => {
      totalOutstanding += p.totalDue || 0;
      const fam = familyMap[p.familyId];
      return {
        ...p,
        familyHeadName: fam?.headName || p.name,
        familyDue: fam?.familyDue || 0,
        lastVisitDate: lastVisitMap[p.patientId] || 'No visit recorded',
      };
    });

    return res.status(200).json({
      success: true,
      summary: {
        totalOutstandingDue: totalOutstanding,
        patientsWithDueCount: reportData.length,
        familiesWithDueCount: familyIds.length,
      },
      data: reportData,
    });
  } catch (error) {
    console.error('Due report error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to generate due report',
      error: error.message,
    });
  }
};

// 7. DASHBOARD LIVE ANALYTICS & SUMMARY
// @route   GET /api/reports/dashboard-summary
// @access  Private
export const getDashboardSummary = async (req, res) => {
  try {
    const todayStr = new Date().toISOString().split('T')[0];

    const [
      totalPatients,
      totalFamilies,
      totalVisits,
      totalCertificates,
      todayVisitsList,
      recentVisitsList,
      allVisitsAgg,
      recentPatientsList,
    ] = await Promise.all([
      Patient.countDocuments(),
      Family.countDocuments(),
      Visit.countDocuments(),
      Certificate.countDocuments(),
      Visit.find({ visitDate: todayStr }).lean(),
      Visit.find().sort({ createdAt: -1 }).limit(8).lean(),
      Visit.aggregate([
        {
          $group: {
            _id: null,
            totalCharge: { $sum: '$charge' },
            totalReceived: { $sum: '$received' },
            totalDue: { $sum: '$due' },
          },
        },
      ]),
      Patient.find().sort({ createdAt: -1 }).limit(5).lean(),
    ]);

    // Today's financials
    let todayCharge = 0;
    let todayReceived = 0;
    let todayDue = 0;
    todayVisitsList.forEach((v) => {
      todayCharge += Number(v.charge) || 0;
      todayReceived += Number(v.received) || 0;
      todayDue += Number(v.due) || 0;
    });

    // Populate patient info for recent visits
    const recentPatientIds = [...new Set(recentVisitsList.map((v) => v.patientId))];
    const patients = await Patient.find({ patientId: { $in: recentPatientIds } }).lean();
    const patientMap = {};
    patients.forEach((p) => {
      patientMap[p.patientId] = p;
    });

    const populatedRecentVisits = recentVisitsList.map((v) => {
      const p = patientMap[v.patientId];
      return {
        ...v,
        patientName: p?.name || v.patientName || 'Patient',
        patientAge: p?.age || '',
        patientGender: p?.gender || 'Male',
        patientArea: p?.area || '',
        patientPhone: p?.phone || '',
      };
    });

    // Last 7 days trend
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    const sevenDaysAgoStr = sevenDaysAgo.toISOString().split('T')[0];

    const weekVisits = await Visit.find({ visitDate: { $gte: sevenDaysAgoStr } }).lean();
    const dayMap = {};
    weekVisits.forEach((v) => {
      if (!dayMap[v.visitDate]) {
        dayMap[v.visitDate] = { count: 0, received: 0, charge: 0 };
      }
      dayMap[v.visitDate].count += 1;
      dayMap[v.visitDate].received += Number(v.received) || 0;
      dayMap[v.visitDate].charge += Number(v.charge) || 0;
    });

    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const stats = dayMap[dateStr] || { count: 0, received: 0, charge: 0 };
      last7Days.push({
        date: dateStr,
        dayName: d.toLocaleDateString('en-US', { weekday: 'short' }),
        count: stats.count,
        received: stats.received,
        charge: stats.charge,
      });
    }

    return res.status(200).json({
      success: true,
      stats: {
        totalPatients,
        totalFamilies,
        totalVisits,
        totalCertificates,
        todayVisitsCount: todayVisitsList.length,
        todayCharge,
        todayReceived,
        todayDue,
        overallCharge: allVisitsAgg[0]?.totalCharge || 0,
        overallReceived: allVisitsAgg[0]?.totalReceived || 0,
        overallDue: allVisitsAgg[0]?.totalDue || 0,
      },
      recentVisits: populatedRecentVisits,
      recentPatients: recentPatientsList,
      last7Days,
    });
  } catch (error) {
    console.error('Dashboard summary error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboard summary',
      error: error.message,
    });
  }
};


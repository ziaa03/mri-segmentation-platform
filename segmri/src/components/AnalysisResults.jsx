import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const AnalysisResults = ({ projectId }) => {
  const [activeTab, setActiveTab] = useState('metrics');
  const [animatedValues, setAnimatedValues] = useState({});
  const [showDetails, setShowDetails] = useState({});
  const [reportGenerated, setReportGenerated] = useState(false);
  const [selectedTimepoint, setSelectedTimepoint] = useState('end-diastole');
  
  // Hardcoded cardiac analysis data
  const cardiacMetrics = {
    'end-diastole': {
      lvVolume: { value: 142, unit: 'ml', normal: '65-195', status: 'normal' },
      rvVolume: { value: 156, unit: 'ml', normal: '65-240', status: 'normal' },
      ejectionFraction: { value: 58, unit: '%', normal: '≥55', status: 'normal' },
      myocardiumMass: { value: 134, unit: 'g', normal: '66-150', status: 'normal' },
      strokeVolume: { value: 82, unit: 'ml', normal: '60-100', status: 'normal' },
      cardiacOutput: { value: 5.7, unit: 'L/min', normal: '4.0-8.0', status: 'normal' }
    },
    'end-systole': {
      lvVolume: { value: 60, unit: 'ml', normal: '20-85', status: 'normal' },
      rvVolume: { value: 65, unit: 'ml', normal: '20-100', status: 'normal' },
      ejectionFraction: { value: 58, unit: '%', normal: '≥55', status: 'normal' },
      myocardiumMass: { value: 134, unit: 'g', normal: '66-150', status: 'normal' },
      strokeVolume: { value: 82, unit: 'ml', normal: '60-100', status: 'normal' },
      cardiacOutput: { value: 5.7, unit: 'L/min', normal: '4.0-8.0', status: 'normal' }
    }
  };

  const aiFindings = [
    { 
      id: 1, 
      severity: 'normal', 
      finding: 'Normal left ventricular function',
      details: 'LV ejection fraction within normal limits (58%). No wall motion abnormalities detected.',
      confidence: 0.94
    },
    { 
      id: 2, 
      severity: 'normal', 
      finding: 'Normal right ventricular function',
      details: 'RV size and function appear normal. RVEF estimated at 56%.',
      confidence: 0.91
    },
    { 
      id: 3, 
      severity: 'mild', 
      finding: 'Mild concentric LV remodeling',
      details: 'LV mass index slightly elevated. May indicate early hypertensive heart disease.',
      confidence: 0.87
    },
    { 
      id: 4, 
      severity: 'normal', 
      finding: 'No evidence of myocardial infarction',
      details: 'No late gadolinium enhancement detected. Normal myocardial viability.',
      confidence: 0.96
    },
    { 
      id: 5, 
      severity: 'normal', 
      finding: 'Normal cardiac valves',
      details: 'All cardiac valves appear structurally normal with no significant regurgitation or stenosis.',
      confidence: 0.89
    }
  ];

  const timeSeriesData = [
    { phase: 'Diastole Start', lvVolume: 65, rvVolume: 70, time: 0 },
    { phase: 'Mid Diastole', lvVolume: 95, rvVolume: 105, time: 25 },
    { phase: 'End Diastole', lvVolume: 142, rvVolume: 156, time: 50 },
    { phase: 'Early Systole', lvVolume: 120, rvVolume: 135, time: 75 },
    { phase: 'End Systole', lvVolume: 60, rvVolume: 65, time: 100 }
  ];

  const regionalAnalysis = [
    { segment: 'Anterior Wall', thickness: 8.2, thickening: 42, motion: 'Normal', perfusion: 'Normal' },
    { segment: 'Septal Wall', thickness: 9.1, thickening: 38, motion: 'Normal', perfusion: 'Normal' },
    { segment: 'Inferior Wall', thickness: 7.8, thickening: 45, motion: 'Normal', perfusion: 'Normal' },
    { segment: 'Lateral Wall', thickness: 8.5, thickening: 40, motion: 'Normal', perfusion: 'Normal' },
    { segment: 'Posterior Wall', thickness: 8.0, thickening: 43, motion: 'Normal', perfusion: 'Normal' },
    { segment: 'Anteroseptal', thickness: 8.8, thickening: 36, motion: 'Normal', perfusion: 'Normal' }
  ];

  // Animate values on component mount
  useEffect(() => {
    const currentMetrics = cardiacMetrics[selectedTimepoint];
    const animated = {};
    
    Object.keys(currentMetrics).forEach(key => {
      animated[key] = 0;
    });
    setAnimatedValues(animated);

    const timer = setTimeout(() => {
      setAnimatedValues(currentMetrics);
    }, 300);

    return () => clearTimeout(timer);
  }, [selectedTimepoint]);

  const getStatusColor = (status) => {
    switch (status) {
      case 'normal': return 'text-green-600';
      case 'mild': return 'text-yellow-600';
      case 'moderate': return 'text-orange-600';
      case 'severe': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getStatusIcon = (severity) => {
    switch (severity) {
      case 'normal':
        return (
          <svg className="h-5 w-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'mild':
        return (
          <svg className="h-5 w-5 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        );
      case 'moderate':
        return (
          <svg className="h-5 w-5 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'severe':
        return (
          <svg className="h-5 w-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      default:
        return null;
    }
  };

  const handleExport = async (format) => {
    setReportGenerated(true);
    // Simulate export process
    setTimeout(() => {
      setReportGenerated(false);
      alert(`${format} export completed!`);
    }, 2000);
  };

  const MetricCard = ({ label, metric, delay = 0 }) => (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay }}
      className="bg-white rounded-lg p-4 shadow-sm border border-gray-200 hover:shadow-md transition-shadow duration-200"
    >
      <div className="flex justify-between items-start mb-2">
        <h5 className="text-sm font-medium text-gray-700">{label}</h5>
        <span className={`text-xs px-2 py-1 rounded-full ${
          metric.status === 'normal' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
        }`}>
          {metric.status}
        </span>
      </div>
      <div className="flex items-end justify-between">
        <div>
          <motion.span
            className="text-2xl font-bold text-[#3A4454]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: delay + 0.2 }}
          >
            {typeof animatedValues[label.toLowerCase().replace(' ', '')] === 'object' 
              ? animatedValues[label.toLowerCase().replace(' ', '')].value || metric.value
              : metric.value}
          </motion.span>
          <span className="text-sm text-gray-500 ml-1">{metric.unit}</span>
        </div>
        <div className="text-right">
          <div className="text-xs text-gray-500">Normal: {metric.normal}</div>
        </div>
      </div>
    </motion.div>
  );

  return (
    <div className="mt-8 border-t border-gray-200 pt-8">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-2xl font-light text-[#3A4454]">Analysis Results</h3>
        <div className="flex items-center space-x-2">
          <select 
            value={selectedTimepoint}
            onChange={(e) => setSelectedTimepoint(e.target.value)}
            className="px-3 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="end-diastole">End Diastole</option>
            <option value="end-systole">End Systole</option>
          </select>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex space-x-1 mb-6 border-b border-gray-200">
        {['metrics', 'findings', 'regional', 'export'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors duration-200 ${
              activeTab === tab
                ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-500'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'metrics' && (
          <motion.div
            key="metrics"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
              <MetricCard 
                label="LV Volume" 
                metric={cardiacMetrics[selectedTimepoint].lvVolume} 
                delay={0} 
              />
              <MetricCard 
                label="RV Volume" 
                metric={cardiacMetrics[selectedTimepoint].rvVolume} 
                delay={0.1} 
              />
              <MetricCard 
                label="Ejection Fraction" 
                metric={cardiacMetrics[selectedTimepoint].ejectionFraction} 
                delay={0.2} 
              />
              <MetricCard 
                label="Myocardium Mass" 
                metric={cardiacMetrics[selectedTimepoint].myocardiumMass} 
                delay={0.3} 
              />
              <MetricCard 
                label="Stroke Volume" 
                metric={cardiacMetrics[selectedTimepoint].strokeVolume} 
                delay={0.4} 
              />
              <MetricCard 
                label="Cardiac Output" 
                metric={cardiacMetrics[selectedTimepoint].cardiacOutput} 
                delay={0.5} 
              />
            </div>

            {/* Cardiac Cycle Visualization */}
            <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
              <h4 className="text-lg font-medium text-[#3A4454] mb-4">Cardiac Cycle Analysis</h4>
              <div className="relative">
                <div className="flex justify-between items-end h-32 mb-4">
                  {timeSeriesData.map((point, index) => (
                    <div key={index} className="flex flex-col items-center">
                      <div className="relative">
                        <div 
                          className="bg-red-500 rounded-t-md transition-all duration-1000 ease-out"
                          style={{ 
                            height: `${(point.lvVolume / 160) * 80}px`,
                            width: '12px',
                            marginBottom: '2px'
                          }}
                        />
                        <div 
                          className="bg-blue-500 rounded-t-md transition-all duration-1000 ease-out"
                          style={{ 
                            height: `${(point.rvVolume / 160) * 80}px`,
                            width: '12px'
                          }}
                        />
                      </div>
                      <div className="text-xs text-gray-600 mt-2 text-center max-w-16">
                        {point.phase}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex items-center justify-center space-x-4 text-sm">
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-red-500 rounded mr-2"></div>
                    <span>LV Volume</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-blue-500 rounded mr-2"></div>
                    <span>RV Volume</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'findings' && (
          <motion.div
            key="findings"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
              <h4 className="text-lg font-medium text-[#3A4454] mb-4">AI Findings</h4>
              <div className="space-y-4">
                {aiFindings.map((finding, index) => (
                  <motion.div
                    key={finding.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors duration-200"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start">
                        {getStatusIcon(finding.severity)}
                        <div className="ml-3 flex-1">
                          <h5 className="font-medium text-[#3A4454]">{finding.finding}</h5>
                          <p className="text-sm text-gray-600 mt-1">{finding.details}</p>
                          <div className="flex items-center mt-2">
                            <span className="text-xs text-gray-500">Confidence: </span>
                            <div className="ml-2 flex-1 max-w-32">
                              <div className="bg-gray-200 rounded-full h-1.5">
                                <div 
                                  className="bg-green-500 h-1.5 rounded-full transition-all duration-1000"
                                  style={{ width: `${finding.confidence * 100}%` }}
                                />
                              </div>
                            </div>
                            <span className="text-xs text-gray-500 ml-2">
                              {Math.round(finding.confidence * 100)}%
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
              <div className="mt-6 pt-4 border-t border-gray-200">
                <p className="text-xs text-gray-500">
                  <span className="font-medium">Note:</span> AI analysis is for assistance only. Please consult with a medical professional for diagnosis.
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'regional' && (
          <motion.div
            key="regional"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
              <h4 className="text-lg font-medium text-[#3A4454] mb-4">Regional Wall Motion Analysis</h4>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Segment
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Thickness (mm)
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Thickening (%)
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Motion
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Perfusion
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {regionalAnalysis.map((segment, index) => (
                      <motion.tr
                        key={segment.segment}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="hover:bg-gray-50"
                      >
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {segment.segment}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {segment.thickness}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <div className="flex items-center">
                            <span className="mr-2">{segment.thickening}</span>
                            <div className="w-16 bg-gray-200 rounded-full h-2">
                              <div 
                                className="bg-blue-500 h-2 rounded-full transition-all duration-1000"
                                style={{ width: `${Math.min(segment.thickening, 100)}%` }}
                              />
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                            {segment.motion}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                            {segment.perfusion}
                          </span>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'export' && (
          <motion.div
            key="export"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Export Options */}
              <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
                <h4 className="text-lg font-medium text-[#3A4454] mb-4">Export Options</h4>
                <div className="space-y-3">
                  <button 
                    onClick={() => handleExport('PDF Report')}
                    className="w-full flex items-center justify-between px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors duration-200"
                    disabled={reportGenerated}
                  >
                    <div className="flex items-center">
                      <svg className="h-5 w-5 text-red-500 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <span className="text-[#3A4454] font-medium">Comprehensive PDF Report</span>
                    </div>
                    {reportGenerated ? (
                      <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                    )}
                  </button>

                  <button 
                    onClick={() => handleExport('DICOM')}
                    className="w-full flex items-center justify-between px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors duration-200"
                  >
                    <div className="flex items-center">
                      <svg className="h-5 w-5 text-blue-500 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span className="text-[#3A4454] font-medium">DICOM with Segmentation</span>
                    </div>
                    <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                  </button>

                  <button 
                    onClick={() => handleExport('CSV')}
                    className="w-full flex items-center justify-between px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors duration-200"
                  >
                    <div className="flex items-center">
                      <svg className="h-5 w-5 text-green-500 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
                      </svg>
                      <span className="text-[#3A4454] font-medium">CSV Measurements</span>
                    </div>
                    <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Patient Record Integration */}
              <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
                <h4 className="text-lg font-medium text-[#3A4454] mb-4">Patient Record</h4>
                <div className="space-y-4">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h5 className="font-medium text-gray-700 mb-2">Study Information</h5>
                    <div className="text-sm text-gray-600 space-y-1">
                      <div>Study Date: {new Date().toLocaleDateString()}</div>
                      <div>Modality: Cardiac MRI</div>
                      <div>Sequence: Cine SSFP</div>
                      <div>Field Strength: 1.5T</div>
                    </div>
                  </div>
                  
                  <button className="w-full bg-[#5B7B9A] text-white px-4 py-3 rounded-lg flex items-center justify-center hover:bg-[#4A6A89] transition-colors duration-200">
                    <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                    </svg>
                    Save to Patient Record
                  </button>
                  
                  <button className="w-full bg-white border border-gray-300 text-[#3A4454] px-4 py-3 rounded-lg flex items-center justify-center hover:bg-gray-50 transition-colors duration-200">
                    <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
                    </svg>
                    Share with Team
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AnalysisResults;
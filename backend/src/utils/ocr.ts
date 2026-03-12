import Tesseract from 'tesseract.js';
import path from 'path';

export interface OCRResult {
  text: string;
  confidence: number;
}

export const performOCR = async (imagePath: string): Promise<OCRResult> => {
  try {
    console.log('Starting OCR process...');
    
    // Create worker with better configuration
    const worker = await Tesseract.createWorker('eng', 1, {
      logger: (m) => {
        if (m.status === 'recognizing text') {
          console.log(`OCR Progress: ${Math.round(m.progress * 100)}%`);
        }
      }
    });

    // Configure Tesseract for better accuracy
    await worker.setParameters({
      tessedit_pageseg_mode: Tesseract.PSM.AUTO, // Auto page segmentation
      tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789.,;:()[]/_-+=%<>@#$&* \n',
      preserve_interword_spaces: '1',
    });

    const result = await worker.recognize(imagePath);
    
    await worker.terminate();

    console.log(`OCR completed with ${result.data.confidence}% confidence`);

    return {
      text: result.data.text,
      confidence: result.data.confidence
    };
  } catch (error) {
    console.error('OCR Error:', error);
    throw new Error('Failed to perform OCR on the image');
  }
};

export const generateReportSummary = (ocrText: string): string => {
  // Clean and split text into lines
  const lines = ocrText
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 3); // Filter out very short lines
  
  const summary: string[] = [];
  
  // Look for report title/name in first few lines
  const titlePatterns = [
    /^(complete blood count|cbc|blood test|lipid profile|thyroid|liver function|kidney function|urine|x-ray|mri|ct scan|ecg|ekg)/i,
    /(laboratory|pathology|radiology|diagnostic) (report|test|examination)/i,
    /^test\s*name\s*[:\-]?\s*(.+)/i
  ];

  // Extract title from first 5 lines
  for (let i = 0; i < Math.min(5, lines.length); i++) {
    for (const pattern of titlePatterns) {
      const match = lines[i].match(pattern);
      if (match) {
        summary.push(`Report Type: ${match[0]}`);
        break;
      }
    }
    if (summary.length > 0) break;
  }

  // Look for patient information
  const patientPattern = /(patient\s*name|name)\s*[:\-]?\s*(.+)/i;
  const datePattern = /(date|collected|reported)\s*[:\-]?\s*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i;
  
  lines.forEach(line => {
    const dateMatch = line.match(datePattern);
    if (dateMatch && summary.length < 3) {
      summary.push(`${dateMatch[1]}: ${dateMatch[2]}`);
    }
  });

  // Look for conclusions or results
  const conclusionPatterns = [
    /^(conclusion|impression|findings|result|diagnosis|interpretation)\s*[:\-]?\s*(.+)/i,
    /^(normal|abnormal|positive|negative|elevated|decreased|within normal limits)/i
  ];

  lines.forEach(line => {
    for (const pattern of conclusionPatterns) {
      const match = line.match(pattern);
      if (match && summary.length < 5) {
        summary.push(line);
        break;
      }
    }
  });

  return summary.length > 0 
    ? summary.join('. ') 
    : 'Medical report processed. Contains ' + lines.length + ' lines of text.';
};

export const extractKeyFindings = (ocrText: string): string[] => {
  const findings: string[] = [];
  const lines = ocrText.split('\n').map(line => line.trim()).filter(line => line.length > 0);

  // Priority medical terms and their context
  const highPriorityTerms = [
    'abnormal', 'critical', 'urgent', 'positive for', 'negative for',
    'elevated', 'decreased', 'high', 'low', 'severe', 'moderate', 'mild',
    'conclusion', 'diagnosis', 'impression', 'interpretation',
    'findings', 'observation', 'recommendation', 'advice'
  ];

  // Medical condition patterns
  const conditionPatterns = [
    /(diabetes|diabetic|glucose)/i,
    /(hypertension|blood pressure|bp)/i,
    /(cholesterol|lipid|hdl|ldl|triglycerides)/i,
    /(anemia|hemoglobin|hb)/i,
    /(infection|bacterial|viral)/i,
    /(kidney|renal|creatinine)/i,
    /(liver|hepatic|sgpt|sgot|alt|ast)/i,
    /(thyroid|tsh|t3|t4)/i,
    /(cancer|malignant|benign|tumor)/i,
    /(fracture|broken|injury)/i
  ];

  // Extract lines with high priority terms
  lines.forEach((line, index) => {
    const lowerLine = line.toLowerCase();
    
    // Check for high priority terms
    const hasHighPriority = highPriorityTerms.some(term => lowerLine.includes(term));
    
    // Check for medical conditions
    const hasCondition = conditionPatterns.some(pattern => pattern.test(line));
    
    // Check for measurement values (numbers with units)
    const hasValue = /\d+\.?\d*\s*(mg\/dl|g\/dl|mmol\/l|ml|mg|g|%|units|u\/l|iu\/ml|ng\/ml|pg\/ml|mmhg)/i.test(line);
    
    if ((hasHighPriority || hasCondition || hasValue) && line.length > 10 && line.length < 200) {
      // Include context from previous or next line if available
      let finding = line;
      
      // If line is very short but important, include next line for context
      if (line.length < 40 && index < lines.length - 1) {
        const nextLine = lines[index + 1];
        if (nextLine.length > 0 && nextLine.length < 150) {
          finding = `${line} - ${nextLine}`;
        }
      }
      
      // Avoid duplicates
      if (!findings.some(f => f.toLowerCase().includes(line.toLowerCase()))) {
        findings.push(finding);
      }
    }
  });

  // If we didn't find enough findings, look for any lines with values
  if (findings.length < 3) {
    lines.forEach(line => {
      if (/\d+/.test(line) && line.length > 15 && line.length < 150) {
        if (!findings.includes(line)) {
          findings.push(line);
        }
      }
    });
  }

  return findings.slice(0, 8); // Return top 8 findings
};

export const extractParameters = (ocrText: string): any[] => {
  const parameters: any[] = [];
  const lines = ocrText.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  
  // Enhanced pattern to match common medical parameter formats:
  // "Hemoglobin: 13.5 g/dL"
  // "Glucose 105 mg/dL (70-100)"
  // "WBC Count: 7500 cells/µL Reference: 4000-11000"
  const paramPatterns = [
    // Pattern 1: Name: Value Unit (Range)
    /^([A-Za-z][A-Za-z\s\(\)\/\-]+?)\s*[:\-]\s*(\d+\.?\d*)\s*([a-zA-Z\/µμ%]+(?:\/[a-zA-Z]+)?)?(?:\s*\((\d+\.?\d*\s*[\-–]\s*\d+\.?\d*)\))?/,
    // Pattern 2: Name Value Unit Range
    /^([A-Za-z][A-Za-z\s\(\)\/\-]+?)\s+(\d+\.?\d*)\s+([a-zA-Z\/µμ%]+(?:\/[a-zA-Z]+)?)?(?:\s+(?:ref|reference|normal)?\s*[:\-]?\s*(\d+\.?\d*\s*[\-–]\s*\d+\.?\d*))?/i,
    // Pattern 3: Abbreviated format - CBC, LFT, etc
    /^([A-Z]{2,5})\s*[:\-]\s*(\d+\.?\d*)\s*([a-zA-Z\/µμ%]+)?/
  ];

  const commonParameters = [
    'hemoglobin', 'hb', 'rbc', 'wbc', 'platelet', 'hematocrit', 'mcv', 'mch', 'mchc',
    'glucose', 'hba1c', 'cholesterol', 'hdl', 'ldl', 'triglycerides',
    'creatinine', 'urea', 'bun', 'uric acid',
    'sgpt', 'sgot', 'alt', 'ast', 'alp', 'bilirubin',
    'tsh', 't3', 't4', 'vitamin d', 'vitamin b12',
    'sodium', 'potassium', 'calcium', 'chloride'
  ];

  lines.forEach((line, index) => {
    const lowerLine = line.toLowerCase();
    
    // Check if line might contain a parameter
    const hasNumberAndUnit = /\d+\.?\d*\s*[a-zA-Z\/µμ%]+/.test(line);
    const hasCommonParam = commonParameters.some(param => lowerLine.includes(param));
    
    if (!hasNumberAndUnit && !hasCommonParam) return;

    // Try each pattern
    for (const pattern of paramPatterns) {
      const match = line.match(pattern);
      if (match) {
        const [, name, value, unit, range] = match;
        
        if (name && value && name.length > 1 && name.length < 50) {
          // Determine status if range is available
          let status = 'normal';
          let normalRange = range || '';
          
          if (range) {
            const [minStr, maxStr] = range.split(/[\-–]/).map(s => s.trim());
            const min = parseFloat(minStr);
            const max = parseFloat(maxStr);
            const val = parseFloat(value);
            
            if (!isNaN(min) && !isNaN(max) && !isNaN(val)) {
              if (val < min) status = 'low';
              else if (val > max) status = 'high';
              else status = 'normal';
            }
          } else {
            // Try to find range in next line
            if (index < lines.length - 1) {
              const nextLine = lines[index + 1];
              const rangeMatch = nextLine.match(/(?:ref|reference|normal|range)\s*[:\-]?\s*(\d+\.?\d*\s*[\-–]\s*\d+\.?\d*)/i);
              if (rangeMatch) {
                normalRange = rangeMatch[1];
              }
            }
          }
          
          // Avoid duplicates
          if (!parameters.some(p => p.name.toLowerCase() === name.toLowerCase().trim())) {
            parameters.push({
              name: name.trim(),
              value: value,
              unit: unit || '',
              normalRange: normalRange,
              status: status
            });
          }
        }
        break;
      }
    }
  });

  return parameters.slice(0, 15); // Return top 15 parameters
};

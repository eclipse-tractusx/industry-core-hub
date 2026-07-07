/********************************************************************************
 * Eclipse Tractus-X - Industry Core Hub Frontend
 *
 * Copyright (c) 2025 Contributors to the Eclipse Foundation
 *
 * See the NOTICE file(s) distributed with this work for additional
 * information regarding copyright ownership.
 *
 * This program and the accompanying materials are made available under the
 * terms of the Apache License, Version 2.0 which is available at
 * https://www.apache.org/licenses/LICENSE-2.0.
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND,
 * either express or implied. See the
 * License for the specific language govern in permissions and limitations
 * under the License.
 *
 * SPDX-License-Identifier: Apache-2.0
 ********************************************************************************/

import React from 'react';
import jsPDF from 'jspdf';
import { QRCodeSVG } from 'qrcode.react';

export interface PDFExportData {
  name: string;
  status?: string;
  version?: string;
  manufacturerPartId?: string;
  serialNumber?: string;
  passportIdentifier?: string;
  twinId?: string;
  semanticId?: string;
  manufacturerBPN?: string;
  discoveryId?: string; // Discovery ID used as fallback for QR code
}

/**
 * Generates a QR code as a data URL for embedding in PDF
 */
async function generateQRCode(discoveryId: string): Promise<string> {
  const canvas = document.createElement('canvas');
  const qrSize = 200;
  canvas.width = qrSize;
  canvas.height = qrSize;
  const ctx = canvas.getContext('2d');
  
  if (!ctx) return '';
  
  const QRCodeLib = await import('qrcode.react');
  const tempDiv = document.createElement('div');
  const root = await import('react-dom/client').then(m => m.createRoot(tempDiv));
  
  return new Promise<string>((resolve) => {
    root.render(
      React.createElement(QRCodeLib.QRCodeSVG, {
        value: discoveryId,
        size: qrSize,
        level: 'M',
        includeMargin: true,
        fgColor: '#654321', // Brown color for QR code
        bgColor: '#FFFFFF'  // White background
      })
    );
    setTimeout(() => {
      const svgElement = tempDiv.querySelector('svg');
      if (svgElement) {
        const svgData = new XMLSerializer().serializeToString(svgElement);
        const img = new Image();
        img.onload = () => {
          ctx.drawImage(img, 0, 0);
          const dataUrl = canvas.toDataURL('image/png');
          root.unmount();
          resolve(dataUrl);
        };
        img.onerror = () => {
          root.unmount();
          resolve('');
        };
        // Use charset=utf-8 and encodeURIComponent for proper SVG encoding
        img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgData);
      } else {
        root.unmount();
        resolve('');
      }
    }, 100);
  });
}

/**
 * Exports a Digital Product Passport to PDF format
 * This function is used by both the provision cards and consumer visualization
 */
export async function exportPassportToPDF(data: PDFExportData): Promise<void> {
  const doc = new jsPDF();
  
  // Define brown color for all text (RGB: 101, 67, 33 - a nice brown that saves black ink)
  const brownColor: [number, number, number] = [101, 67, 33];
  
  // Generate QR code using discoveryId if available, otherwise construct from manufacturerPartId and serialNumber
  let qrCodeDataUrl = '';
  let discoveryId: string | null = null;
  
  if (data.discoveryId) {
    // Use the provided discovery ID directly
    discoveryId = data.discoveryId;
  } else if (data.manufacturerPartId && data.serialNumber) {
    // Construct discovery ID from manufacturer part ID and serial number
    discoveryId = `CX:${data.manufacturerPartId}:${data.serialNumber}`;
  }
  
  if (discoveryId) {
    qrCodeDataUrl = await generateQRCode(discoveryId);
  }
  
  // Title (left side)
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...brownColor);
  doc.text('Digital Product Passport', 20, 20);
  
  // Product Name (left side)
  doc.setFontSize(16);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...brownColor);
  doc.text(data.name, 20, 32);
  
  // Add QR Code box in top right if available
  let separatorEndX = 190;
  if (qrCodeDataUrl && discoveryId) {
    const qrCodeSize = 60;
    const boxPadding = 7;
    const boxX = 128;
    const boxY = 8;
    const boxSize = qrCodeSize + (boxPadding * 2);
    
    // Draw outer border box (dashed line for cutting guide) - brown
    doc.setLineWidth(0.3);
    doc.setLineDash([2, 2]);
    doc.setDrawColor(...brownColor);
    doc.rect(boxX - 2, boxY - 2, boxSize + 4, boxSize + 4);
    
    // Draw inner solid border box - brown
    doc.setLineDash([]);
    doc.setLineWidth(0.5);
    doc.setDrawColor(...brownColor);
    doc.rect(boxX, boxY, boxSize, boxSize);
    
    // Add QR code centered in the box
    doc.addImage(qrCodeDataUrl, 'PNG', boxX + boxPadding, boxY + boxPadding, qrCodeSize, qrCodeSize);
    
    // Display actual Discovery ID below the box - brown
    doc.setFontSize(6);
    doc.setFont('courier', 'normal');
    doc.setTextColor(...brownColor);
    doc.text(discoveryId, boxX + (boxSize / 2), boxY + boxSize + 4, { align: 'center' });
    
    // Add scissors icon symbol (✂) - brown
    doc.setFontSize(8);
    doc.setTextColor(...brownColor);
    doc.text('✂', boxX - 5, boxY + 5);
    
    // Adjust separator line to not cross QR code box
    separatorEndX = boxX - 5;
  }
  
  // Separator line (stops before QR code) - brown
  doc.setLineWidth(0.5);
  doc.setDrawColor(...brownColor);
  doc.line(20, 42, separatorEndX, 42);
  
  // Information sections
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...brownColor);
  
  let yPos = 55;
  const lineHeight = 8;
  
  // Status
  if (data.status) {
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...brownColor);
    doc.text('Status:', 20, yPos);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...brownColor);
    doc.text(data.status.toUpperCase(), 60, yPos);
    yPos += lineHeight;
  }
  
  // BPN (Business Partner Number)
  if (data.manufacturerBPN) {
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...brownColor);
    doc.text('Manufacturer ID:', 20, yPos);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...brownColor);
    doc.text(data.manufacturerBPN, 60, yPos);
    yPos += lineHeight;
  }
  
  // Version
  if (data.version) {
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...brownColor);
    doc.text('Version:', 20, yPos);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...brownColor);
    doc.text(data.version, 60, yPos);
    yPos += lineHeight;
  }
  
  // Manufacturer Part ID
  if (data.manufacturerPartId) {
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...brownColor);
    doc.text('Manufacturer Part ID:', 20, yPos);
    doc.setFont('courier', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(...brownColor);
    doc.text(data.manufacturerPartId, 20, yPos + 5);
    doc.setFontSize(12);
    yPos += lineHeight + 5;
  }
  
  // Part Instance ID (Serial Number)
  if (data.serialNumber) {
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...brownColor);
    doc.text('Part Instance ID:', 20, yPos);
    doc.setFont('courier', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(...brownColor);
    doc.text(data.serialNumber, 20, yPos + 5);
    doc.setFontSize(12);
    yPos += lineHeight + 5;
  }
  
  // Discovery ID
  if (data.manufacturerPartId && data.serialNumber) {
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...brownColor);
    doc.text('Passport Discovery ID:', 20, yPos);
    doc.setFont('courier', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(...brownColor);
    doc.text(`CX:${data.manufacturerPartId}:${data.serialNumber}`, 20, yPos + 5);
    doc.setFontSize(12);
    yPos += lineHeight + 5;
  }
  
  // Passport ID
  if (data.passportIdentifier) {
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...brownColor);
    doc.text('Passport ID:', 20, yPos);
    doc.setFont('courier', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(...brownColor);
    doc.text(data.passportIdentifier, 20, yPos + 5);
    doc.setFontSize(12);
    yPos += lineHeight + 5;
  }
  
  // AAS ID (Twin ID)
  if (data.twinId) {
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...brownColor);
    doc.text('AAS ID:', 20, yPos);
    doc.setFont('courier', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(...brownColor);
    doc.text(data.twinId, 20, yPos + 5);
    doc.setFontSize(12);
    yPos += lineHeight + 5;
  }
  
  // Semantic ID (placed last)
  if (data.semanticId) {
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...brownColor);
    doc.text('Semantic ID:', 20, yPos);
    doc.setFont('courier', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...brownColor);
    const semanticIdLines = doc.splitTextToSize(data.semanticId, 170);
    doc.text(semanticIdLines, 20, yPos + 5);
    doc.setFontSize(12);
    yPos += (semanticIdLines.length * 3) + 8;
  }
  
  // Add margin between semantic ID and alert box
  yPos += 10;
  
    // Dataspace sharing notice - styled as alert box with brown colors
    const boxHeight = 28;

    // Border (outer box for alert look) - brown
    doc.setDrawColor(...brownColor);
    doc.setLineWidth(1);
    doc.roundedRect(15, yPos - 3, 180, boxHeight, 2, 2, 'S');

    // Light brown/tan background
    doc.setFillColor(245, 235, 220); // Light tan
    doc.roundedRect(15.5, yPos - 2.5, 179, boxHeight - 1, 2, 2, 'F');

    // Icon area (darker brown stripe on left)
    doc.setFillColor(...brownColor);
    doc.rect(16, yPos - 2, 8, boxHeight - 2, 'F');

    // Info icon (light tan)
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(245, 235, 220);
    doc.text('i', 19.5, yPos + 4);

    // Title - brown
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...brownColor);
    doc.text('Shared & Accessible via Dataspace', 28, yPos + 3);

    // Notice text - brown
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...brownColor);
    const noticeText = 'An Eclipse Tractus-X dataspace membership and DSP agreement to the license of usage (negotiated via an EDC Connector, or similar), may be required to get authorization for this data.';
    const noticeLines = doc.splitTextToSize(noticeText, 160);
    doc.text(noticeLines, 28, yPos + 9);

    yPos += boxHeight + 5;

  // Footer - brown
  doc.setFontSize(9);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(...brownColor);
  doc.text('Generated by Industry Core Hub', 105, 280, { align: 'center' });
  doc.text(new Date().toLocaleString(), 105, 285, { align: 'center' });
  
  // Save PDF
  const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const identifier = (data.passportIdentifier || Date.now().toString())
    .replace(/[^a-zA-Z0-9-_]/g, '_'); // Sanitize identifier for filepath
  const fileName = `passport-${identifier}-${timestamp}.pdf`;
  doc.save(fileName);
}

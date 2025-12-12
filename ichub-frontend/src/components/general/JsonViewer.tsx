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

import React, { useState } from 'react';
import {
    Box,
    Typography,
    IconButton,
    Paper,
    Tooltip
} from '@mui/material';
import {
    ContentCopy as ContentCopyIcon,
    Check as CheckIcon,
    DataObject as DataObjectIcon,
    Download as DownloadIcon
} from '@mui/icons-material';
import { downloadJson } from '../../utils/downloadJson';


interface JsonViewerProps {
    data: Record<string, unknown>;
    filename?: string;
    height?: string | number;
}

export const JsonViewer: React.FC<JsonViewerProps> = ({ 
    data, 
    filename = 'data.json',
    height = '100%'
}) => {
    const [copySuccess, setCopySuccess] = useState(false);

    const handleCopyJson = () => {
        navigator.clipboard.writeText(JSON.stringify(data, null, 4)).then(() => {
            setCopySuccess(true);
            setTimeout(() => setCopySuccess(false), 2000);
        });
    };

    // Format JSON with line numbers and higher indentation

    const handleDownloadJson = () => {
        downloadJson(data, filename);
    };
    const jsonString = JSON.stringify(data, null, 4); // Increased indentation to 4 spaces
    const lines = jsonString.split('\n');

    const formatJsonWithLineNumbers = () => {
        // Calculate the width needed for line numbers based on total lines
        const totalLines = lines.length;
        const lineNumberWidth = Math.max(50, (totalLines.toString().length * 8) + 16); // 8px per digit + 16px padding
        
                const handleDownloadJson = () => {
                    downloadJson(data, filename);
                };
        return lines.map((line, index) => {
            const lineNumber = index + 1;
            return (
                <Box key={index} sx={{ display: 'flex', minHeight: '1.5rem' }}>
                    <Box
                        sx={{
                            width: `${lineNumberWidth}px`,
                            textAlign: 'right',
                            pr: 2,
                            color: '#858585', // VS Code line number color
                            fontSize: '13px',
                            fontFamily: 'Consolas, "Courier New", monospace',
                            letterSpacing: '0.5px',
                            userSelect: 'none',
                            borderRight: '1px solid #3E3E3E', // VS Code border color
                            backgroundColor: '#252526', // VS Code line number background
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'flex-end',
                            minHeight: '18px', // VS Code line height
                            lineHeight: '18px',
                            flexShrink: 0 // Prevent shrinking when content is wide
                        }}
                    >
                        {lineNumber}
                    </Box>
                    <Box
                        sx={{
                            flex: 1,
                            pl: 2,
                            fontFamily: 'Consolas, "Courier New", monospace',
                            fontSize: '13px',
                            letterSpacing: '0.5px',
                            whiteSpace: 'pre',
                            color: '#D4D4D4',
                            display: 'flex',
                            alignItems: 'center',
                            minHeight: '18px', // VS Code line height
                            lineHeight: '18px'
                        }}
                    >
                        <span dangerouslySetInnerHTML={{ __html: highlightJson(line) }} />
                    </Box>
                </Box>
            );
        });
    };

    const highlightJson = (line: string): string => {
        let highlightedLine = line;
        
        // Escape HTML first
        highlightedLine = highlightedLine
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
        
        // Property names (keys) - strings followed by colon - VS Code blue
        highlightedLine = highlightedLine.replace(
            /("(?:[^"\\]|\\.)*")\s*:/g, 
            '<span style="color: #9CDCFE;">$1</span>:'
        );
        
        // String values after colon (object values) - VS Code orange
        highlightedLine = highlightedLine.replace(
            /:\s*("(?:[^"\\]|\\.)*")/g, 
            ': <span style="color: #CE9178;">$1</span>'
        );
        
        // String values in arrays (after [ or , but not after :) - VS Code orange
        highlightedLine = highlightedLine.replace(
            /(\[\s*|,\s*)("(?:[^"\\]|\\.)*")/g, 
            '$1<span style="color: #CE9178;">$2</span>'
        );
        
        // Numbers after colon (object values) - VS Code light green
        highlightedLine = highlightedLine.replace(
            /:\s*(-?\d+\.?\d*)/g, 
            ': <span style="color: #B5CEA8;">$1</span>'
        );
        
        // Numbers in arrays (after [ or , but not after :) - VS Code light green
        highlightedLine = highlightedLine.replace(
            /(\[\s*|,\s*)(-?\d+\.?\d*)/g, 
            '$1<span style="color: #B5CEA8;">$2</span>'
        );
        
        // Booleans after colon - VS Code blue keywords
        highlightedLine = highlightedLine.replace(
            /:\s*(true|false)/g, 
            ': <span style="color: #569CD6;">$1</span>'
        );
        
        // Booleans in arrays - VS Code blue keywords
        highlightedLine = highlightedLine.replace(
            /(\[\s*|,\s*)(true|false)/g, 
            '$1<span style="color: #569CD6;">$2</span>'
        );
        
        // null after colon - VS Code blue keywords
        highlightedLine = highlightedLine.replace(
            /:\s*(null)/g, 
            ': <span style="color: #569CD6;">$1</span>'
        );
        
        // null in arrays - VS Code blue keywords
        highlightedLine = highlightedLine.replace(
            /(\[\s*|,\s*)(null)/g, 
            '$1<span style="color: #569CD6;">$2</span>'
        );
        
        // Brackets and braces - VS Code yellow
        highlightedLine = highlightedLine.replace(
            /([{}[\]])/g, 
            '<span style="color: #FFD700;">$1</span>'
        );
        
        // Commas - VS Code default text color
        highlightedLine = highlightedLine.replace(
            /(,)/g, 
            '<span style="color: #D4D4D4;">$1</span>'
        );
        
        return highlightedLine;
    };

    return (
        <Box sx={{ position: 'relative', height }}>
            {/* VS Code-like tab header */}
            <Box
                sx={{
                    height: '35px',
                    backgroundColor: '#2D2D30',
                    borderBottom: '1px solid #3E3E3E',
                    display: 'flex',
                    alignItems: 'center',
                    px: 2,
                    fontSize: '13px',
                    fontFamily: '"Segoe UI", "Helvetica Neue", Arial, sans-serif',
                    color: '#CCCCCC'
                }}
            >
                <DataObjectIcon sx={{ fontSize: '16px', mr: 1, color: '#FFD700' }} />
                <Typography variant="body2" sx={{ fontSize: '13px', fontFamily: 'inherit' }}>
                    {filename}
                </Typography>
                <Box sx={{ ml: 'auto', display: 'flex', gap: 1 }}>
                    <Tooltip title={copySuccess ? "Copied!" : "Copy JSON"}>
                        <IconButton
                            size="small"
                            onClick={handleCopyJson}
                            sx={{
                                color: copySuccess ? '#4CAF50' : '#CCCCCC',
                                backgroundColor: copySuccess ? 'rgba(76, 175, 80, 0.1)' : 'transparent',
                                '&:hover': {
                                    backgroundColor: copySuccess 
                                        ? 'rgba(76, 175, 80, 0.2)' 
                                        : 'rgba(255, 255, 255, 0.1)'
                                },
                                transition: 'all 0.2s ease-in-out'
                            }}
                        >
                            {copySuccess ? <CheckIcon fontSize="small" /> : <ContentCopyIcon fontSize="small" />}
                        </IconButton>
                    </Tooltip>
                    <Tooltip title="Download JSON">
                        <IconButton
                            size="small"
                            onClick={handleDownloadJson}
                            sx={{
                                color: '#CCCCCC',
                                '&:hover': {
                                    backgroundColor: 'rgba(255, 255, 255, 0.1)'
                                },
                                transition: 'all 0.2s ease-in-out'
                            }}
                        >
                            <DownloadIcon fontSize="small" />
                        </IconButton>
                    </Tooltip>
                </Box>
            </Box>
            
            <Paper
                sx={{
                    width: '100%',
                    height: 'calc(100% - 35px)', // Account for header
                    backgroundColor: '#1E1E1E', // VS Code dark background
                    border: '1px solid #3E3E3E', // VS Code border color
                    borderTop: 'none', // No top border since we have the header
                    borderRadius: 0,
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                    fontFamily: 'Consolas, "Courier New", monospace',
                }}
            >
                <Box
                    sx={{
                        maxHeight: '100%',
                        overflow: 'auto',
                        '&::-webkit-scrollbar': {
                            width: '14px',
                            height: '14px'
                        },
                        '&::-webkit-scrollbar-track': {
                            backgroundColor: '#1E1E1E' // Match editor background
                        },
                        '&::-webkit-scrollbar-thumb': {
                            backgroundColor: '#424242', // VS Code scrollbar thumb
                            borderRadius: '0px',
                            border: '1px solid #1E1E1E'
                        },
                        '&::-webkit-scrollbar-thumb:hover': {
                            backgroundColor: '#4F4F4F' // Lighter on hover
                        },
                        '&::-webkit-scrollbar-corner': {
                            backgroundColor: '#1E1E1E'
                        }
                    }}
                >
                    {formatJsonWithLineNumbers()}
                </Box>
            </Paper>
        </Box>
    );
};

export default JsonViewer;

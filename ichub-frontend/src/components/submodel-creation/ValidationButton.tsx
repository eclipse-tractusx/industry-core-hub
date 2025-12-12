/********************************************************************************
 * Eclipse Tractus-X - Industry Core Hub Frontend
 *
 * Copyright (c) 2025 LKS Next
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
import { Button, Badge, Tooltip } from '@mui/material';
import CheckBoxOutlineBlankIcon from '@mui/icons-material/CheckBoxOutlineBlank';
import CheckBoxIcon from '@mui/icons-material/CheckBox';
import RefreshIcon from '@mui/icons-material/Refresh';
import ErrorIcon from '@mui/icons-material/Error';

type ValidationState = 'initial' | 'validated' | 'errors';

interface ValidationButtonProps {
    validationState: ValidationState;
    validationErrorsCount: number;
    onValidate: () => void;
    onShowErrors: () => void;
    tooltipInitial?: string;
    tooltipValidated?: string;
    tooltipValidatedHover?: string;
    tooltipErrors?: string;
}

export const ValidationButton: React.FC<ValidationButtonProps> = ({
    validationState,
    validationErrorsCount,
    onValidate,
    onShowErrors,
    tooltipInitial = 'Validate your form data',
    tooltipValidated = 'Form is validated and ready',
    tooltipValidatedHover = 'Click to re-validate the form',
    tooltipErrors = 'View validation errors'
}) => {
    const [isHoveringValidated, setIsHoveringValidated] = useState(false);

    if (validationState === 'initial') {
        return (
            <Tooltip title={tooltipInitial} placement="top">
                <Button
                variant="contained"
                size="large"
                startIcon={<CheckBoxOutlineBlankIcon />}
                onClick={onValidate}
                sx={{
                    background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                    borderRadius: '10px',
                    textTransform: 'none',
                    color: '#ffffff',
                    px: 4,
                    py: 1.5,
                    fontSize: '1rem',
                    fontWeight: 600,
                    boxShadow: '0 4px 16px rgba(245, 158, 11, 0.3)',
                    marginRight: 2,
                    '&:hover': {
                        background: 'linear-gradient(135deg, #d97706 0%, #f59e0b 100%)',
                        transform: 'translateY(-1px)',
                        boxShadow: '0 6px 20px rgba(245, 158, 11, 0.4)',
                    },
                    transition: 'all 0.2s ease-in-out',
                }}
            >
                Validate
            </Button>
            </Tooltip>
        );
    }

    if (validationState === 'validated') {
        return (
            <Tooltip title={isHoveringValidated ? tooltipValidatedHover : tooltipValidated} placement="top">
                <Button
                variant="contained"
                size="large"
                startIcon={isHoveringValidated ? <RefreshIcon /> : <CheckBoxIcon />}
                onClick={onValidate}
                onMouseEnter={() => setIsHoveringValidated(true)}
                onMouseLeave={() => setIsHoveringValidated(false)}
                sx={{
                    background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
                    borderRadius: '10px',
                    textTransform: 'none',
                    color: '#ffffff',
                    px: 4,
                    py: 1.5,
                    fontSize: '1rem',
                    fontWeight: 600,
                    boxShadow: '0 4px 16px rgba(34, 197, 94, 0.3)',
                    marginRight: 2,
                    '&:hover': {
                        background: 'linear-gradient(135deg, #16a34a 0%, #22c55e 100%)',
                        transform: 'translateY(-1px)',
                        boxShadow: '0 6px 20px rgba(34, 197, 94, 0.4)',
                    },
                    transition: 'all 0.2s ease-in-out',
                }}
            >
                {isHoveringValidated ? 'Re-validate' : 'Validated'}
            </Button>
            </Tooltip>
        );
    }

    // validationState === 'errors'
    return (
        <Tooltip title={tooltipErrors} placement="top">
            <Button
            variant="contained"
            size="large"
            startIcon={
                <Badge 
                    badgeContent={validationErrorsCount} 
                    color="error"
                    sx={{ 
                        '& .MuiBadge-badge': { 
                            fontSize: '0.65rem',
                            minWidth: '16px',
                            height: '16px'
                        } 
                    }}
                >
                    <ErrorIcon />
                </Badge>
            }
            onClick={onShowErrors}
            sx={{
                background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                borderRadius: '10px',
                textTransform: 'none',
                color: '#ffffff',
                px: 4,
                py: 1.5,
                fontSize: '1rem',
                fontWeight: 600,
                boxShadow: '0 4px 16px rgba(239, 68, 68, 0.3)',
                marginRight: 2,
                '&:hover': {
                    background: 'linear-gradient(135deg, #dc2626 0%, #ef4444 100%)',
                    transform: 'translateY(-1px)',
                    boxShadow: '0 6px 20px rgba(239, 68, 68, 0.4)',
                },
                transition: 'all 0.2s ease-in-out',
            }}
        >
            Errors
        </Button>
        </Tooltip>
    );
};

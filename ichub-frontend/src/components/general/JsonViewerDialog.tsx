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

import { useState } from 'react';
import { Button, Dialog, DialogHeader, DialogContent, Icon } from '@catena-x/portal-shared-components';

import { JsonViewerDialogProps } from '../../types/jsonViewer';

const JsonViewerDialog = ({ open, onClose, carJsonData }: JsonViewerDialogProps) => {
    const [copied, setCopied] = useState(false);
    const title = carJsonData?.name ? `${carJsonData.name} JSON data` : "DCM JSON Data";
    const description = carJsonData?.description ? `${carJsonData.description}` : "";

    const handleCopy = () => {
        const json_string = JSON.stringify(carJsonData, null, 2);
        navigator.clipboard.writeText(json_string)
          .then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          })
          .catch((error) => {
            console.error("Failed to copy text: ", error);
          });
      };

    return (
        <Dialog open={open} maxWidth="xl">
            <DialogHeader intro={description} title={title} />
            <DialogContent>
                <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', background: '#f4f4f4', padding: '0 10px', borderRadius: '5px', textAlign: 'right' }}>
                    <span className='mr-3'>{copied ? "JSON copied ✅" : ""}</span>
                    <Button variant="text" onClick={handleCopy} size='small'>
                        <Icon fontSize="16" iconName="ContentCopy" />
                    </Button>
                </pre>
                <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', background: '#f4f4f4', padding: '0 10px 5px 10px', borderRadius: '5px' }}>
                    {JSON.stringify(carJsonData, null, 2)}
                </pre>
            </DialogContent>
            <div className="mx-auto my-4 text-center">
                <Button variant="outlined" onClick={onClose} size='small'>
                    <Icon fontSize="16" iconName="Close" />
                    Close
                </Button>
            </div>
        </Dialog>
    )
}

export default JsonViewerDialog
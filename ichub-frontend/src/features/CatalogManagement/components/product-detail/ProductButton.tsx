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

import { Grid2, Button } from '@mui/material';
import { Icon } from '@catena-x/portal-shared-components';

interface ProductButtonProps {
  gridSize?: { md?: number; xs?: number; lg?: number; sm?: number };
  buttonText: string;
  onClick: () => void;
}

const ProductButton = ({ gridSize, buttonText, onClick }: ProductButtonProps) => {
  return (
    <Grid2 size={gridSize || { md: 6, xs: 12 }}>
      <Button className="submodel-button" variant="outlined" color="primary" size="large" fullWidth={true} onClick={onClick}>
        <span className="submodel-button-content">{buttonText}</span>
        <Icon fontSize="16" iconName="OpenInNew" />
      </Button>
    </Grid2>
  );
};

export default ProductButton;

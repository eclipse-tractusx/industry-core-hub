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

import { Grid2 } from "@mui/material";
import ReportProblemIcon from '@mui/icons-material/ReportProblem';

interface ErrorNotFoundProps {
  icon?: React.ElementType;
  message?: string;
}

export const ErrorNotFound = ({
  icon = ReportProblemIcon,
  message = "No catalog parts available, please check your ichub-backend connection/configuration.",
}: ErrorNotFoundProps) => {
  const IconComponent = icon;
  return (
    <Grid2 container display={"flex"} flexDirection={"row"} alignContent={"center"} justifyContent={"center"}>
      <Grid2>
        <IconComponent className="not-found icon my-auto mr-1" />
      </Grid2>
      <Grid2 className="not-found title">
        {message}
      </Grid2>
    </Grid2>
  );
}
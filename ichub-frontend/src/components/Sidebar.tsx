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

import { Menu } from '@catena-x/portal-shared-components';

const Sidebar = () => {
  return (
      <Menu
        items={[
          {
            children: [
              { href: '/', title: 'Bosch' },
              { href: '/', title: 'MagnaFlow' },
              { href: '/', title: 'Brembo' },
              { href: '/', title: 'Pirelli' },
              { href: '/', title: 'Monroe' },
              { href: '/', title: 'Valeo' }
            ],
            href: '/',
            title: 'Brands'
          },
          {
            children: [
              { href: '/', title: 'Turbochargers' },
              { href: '/', title: 'Suspension Parts' },
              { href: '/', title: 'Brake Pads' },
              { href: '/', title: 'Engine Blocks' }
            ],
            href: '/',
            title: 'Categories'
          },
          {
            children: [
              { href: '/', title: 'BASF' },
              { href: '/', title: 'BMW' },
              { href: '/', title: 'BOSCH' },
              { href: '/', title: 'Mercedes-Benz' },
              { href: '/', title: 'Volkswagen' },
            ],
            href: '/',
            title: 'Shared with'
          },
          {
            children: [
              { href: '/', title: 'Draft' },
              { href: '/', title: 'Pending' },
              { href: '/', title: 'Registered' }
            ],
            href: '/',
            title: 'Status'
          },
        ]}
        />
  )
}

export default Sidebar
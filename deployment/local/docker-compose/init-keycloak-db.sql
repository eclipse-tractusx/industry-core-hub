/********************************************************************************
* Eclipse Tractus-X - Industry Core Hub                                      
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
* distributed under the License is distributed on an "AS IS" BASIS, WITHOUT   
* WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the    
* License for the specific language governing permissions and limitations     
* under the License.                                                          
*                                                                             
* SPDX-License-Identifier: Apache-2.0                                         
*********************************************************************************/

-- Create Keycloak user and database
CREATE USER keycloak WITH PASSWORD 'keycloak';
CREATE DATABASE keycloak WITH OWNER keycloak;

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE keycloak TO keycloak;

-- Connect to keycloak database and grant schema privileges
\c keycloak
GRANT ALL ON SCHEMA public TO keycloak;

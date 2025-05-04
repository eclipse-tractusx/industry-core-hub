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

import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import carPartsData from "../tests/payloads/sample-data.json";
import { ProductCard } from "../components/general/ProductCard";
import { PartInstance } from "../types/product";
import TablePagination from '@mui/material/TablePagination';
import { Typography, IconButton,Grid2 } from '@mui/material';
import { Menu as MenuIcon } from '@mui/icons-material';
import { styled } from '@mui/material/styles';
import Sidebar from '../features/CatalogManagement/components/side-bar/SideBar';
import {Drawer} from '../shared/hooks/drawer';


const ProductsList = () => {
  const [carParts, setCarParts] = useState<PartInstance[]>([]);
  const [initialCarParts, setInitialCarParts] = useState<PartInstance[]>([]);
  const [page, setPage] = useState(0);
  const rowsPerPage = 10;
  const navigate = useNavigate();
  const drawerWidth = 140;
  const { isOpen, openDrawer, closeDrawer } = Drawer();

  // Typing for the styled components
  const Main = styled('main', { shouldForwardProp: (prop) => prop !== 'open' })<{ open: boolean }>(
    ({ theme, open }) => ({
      flexGrow: 1,
      padding: theme.spacing(3),
      transition: theme.transitions.create('margin', {
        easing: theme.transitions.easing.sharp,
        duration: theme.transitions.duration.leavingScreen,
      }),
      marginLeft: `-${drawerWidth}px`,
      ...(open && {
        transition: theme.transitions.create('margin', {
          easing: theme.transitions.easing.easeOut,
          duration: theme.transitions.duration.enteringScreen,
        }),
        marginLeft: 0,
      }),
    })
  );
  


  const handleChangePage = (
    event: React.MouseEvent<HTMLButtonElement> | null,
    newPage: number,
  ) => {
    setPage(newPage);
  };

  useEffect(() => {
    const mappedCarParts = carPartsData.map((part) => ({
      ...part,
      status: part.status ,
    }));
    setCarParts(mappedCarParts);
    // Define the async function inside useEffect
    const fetchData = async () => {
      try {
        const data = carPartsData;  // Resolve the promise
        setCarParts(data);
        setInitialCarParts(data);
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };
    fetchData();  // Call the async function
  }, []);

  const handleButtonClick = (part: string) => {
    navigate(`/product/${part}`);  // Navigate to the details page
  };

  const visibleRows = useMemo(
    () => {
      return [...carParts].slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
    },
    [page, rowsPerPage, carParts],
  );

  return (
    <>
    <Grid2 size={{md: 2}}  className="padding-trb">
      <Sidebar isOpen={isOpen} onClose={closeDrawer}/>
    </Grid2>
    <Grid2 size={{md: isOpen ? 10 : 12}} className={ `${isOpen} ? 'padding-twenty  product-catalog flex flex-content-center' : ' product-catalog flex flex-content-center'`} container spacing={1}>
      <Grid2 size={{ md:12}} className="flex flex-content-center" >
          <Typography className="text" open={isOpen}>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            onClick={openDrawer}
            edge="start"
            sx={{ mr: 2, ...(isOpen && { display: 'none' }) }}
          >
            <MenuIcon />
          </IconButton>Catalog Parts &nbsp; &nbsp;&nbsp;&nbsp;&nbsp;
        </Typography>
      </Grid2>
    

     

      <Grid2 className="flex flex-content-center"  size={{ md: 12 }}>
      <Main open={isOpen}>
        <ProductCard
          onClick={(itemId: any) => handleButtonClick(itemId)}
          items={visibleRows.map((part) => ({
            uuid: part.uuid,
            name: part.name,
            class: part.class,
            status: part.status,
          }))}
        />
          </Main>
      </Grid2>
      <Grid2 size={{ md: 12}}  className="flex flex-content-center pagination-text">
        <TablePagination
          rowsPerPageOptions={[10]}
          component="div"
          count={initialCarParts.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
        />
      </Grid2>
    </Grid2></>
  );
};

export default ProductsList;

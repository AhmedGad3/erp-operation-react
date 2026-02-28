import "./App.css";
import { RouterProvider, createHashRouter } from "react-router-dom";
import Layout from "./components/Layout/Layout";

import Login from "./components/Login/Login";
import Error from "./components/Error/Error";
import NotFound from "./components/NotFound/NotFound";
import AuthContextProvider from "./context/AuthContext";
import ProtectedRoute from "./components/protectedRoute/ProtectedRoute";

import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import VerifyLogin from "./components/VerifyLogin/VerifyLogin";

// ===== ERP =====
import Dashboard from "./components/Dashboard/Dashboard";
import Suppliers from "./components/Supplier/Supplier";
import Supplies from "./components/Supplies/Supplies";
import Units from "./components/units/units";
import PurchaseOrders from "./components/PurchaseOrders/PurchaseOrders";
import PurchaseReturns from "./components/PurchaseReturn/PurchaseReturn";
import CreatePurchaseReturn from "./components/PurchaseReturnForm/PurchaseReturnForm";
import SupplierPayments from "./components/SupplierPayment/SupplierPayment";
import SupplierRefundForm from "./components/SupplierRefundForm/SupplierRefundForm";
import SupplierLedger from "./components/SupplierLedger/SupplierLedger";
import ClientLedger from "./components/ClientLedger/ClientLedger";
import LanguageProvider from "./context/LanguageContext";
import SupplierRefundsList from "./components/SupplierRefund/SupplierRefund";

// User Management
import UsersList from "./components/Users/Users";
import CreateUser from "./components/CreateUser/CreateUser";
import EditUser from "./components/EditUser/EditUser";
import Clients from "./components/Clients/Clients";
import CreateClient from "./components/ClientModal/ClientModal";
import CreateProject from "./components/CreateProject/CreateProject";
import ProjectsList from "./components/Projects/Projects";
import ProjectDetails from "./components/ProjectDetails/ProjectDetails";
import CreateMaterialIssue from "./components/MaterialIssue/MaterialIssue";
import PaymentsList from './components/ClientsPayment/ClientsPayment';
import CreateClientPayment from "./components/CreateClientPayment/CreateClientPayment";
import PaymentDetails from './components/ClientsPaymentDetails/ClientsPaymentDetails';
import CreateSupplierPayment from "./components/CreateSupplierPayment/CreateSupplierPayment";
import StockAdjustment from "./components/Adjustment/Adjustment";
import ReportsPage from "./components/Reports/Reports";
import Assets from "./components/Assets/Assets";
import ProjectLaborDetails from "./components/ProjectLaborDetails/ProjectLaborDetails";
import ProjectEquipmentDetails from "./components/ProjectEquipmentDetails/ProjectEquipmentDetails";
import ProjectMiscellaneousDetails from "./components/ProjectMiscellaneousDetails/ProjectMiscellaneousDetails";
import ProjectMaterialDetails from "./components/ProjectMaterialDetails/ProjectMaterialDetails";
import GeneralExpenses from "./components/General-Expenses/General-Expenses";
import ExpenseDetails from './components/General-ExpensesDetails/General-ExpensesDetails';
import ProjectSubcontractorWork from "./components/SubContractorWorks/SubContractorWorks";
import SupplierRefundDetails from "./components/SupplierRefundDetails/SupplierRefundDetails";
import AssetInvoiceForm from "./components/AssetInvoiceForm/AssetInvoiceForm";
import AssetDetails from "./components/AssetDetails/AssetDetails";

function App() {
  const router = createHashRouter([
    // ================= Public Routes =================
    {
      path: "/login",
      element: <Login />,
    },
    {
      path: "/verify-login",
      element: <VerifyLogin />,
    },

    // ================= Protected Layout =================
    {
      path: "/",
      element: (
        <ProtectedRoute>
          <Layout />
        </ProtectedRoute>
      ),
      errorElement: <Error />,
      children: [
        // ── متاح لكل اليوزرين ──
        { index: true, element: <Dashboard /> },

        { path: "suppliers",   element: <Suppliers /> },
        { path: "materials",   element: <Supplies />  },
        { path: "assets",      element: <Assets />    },
        { path: "assets/:id",              element: <AssetDetails />    },
        { path: "assets/invoice/create",   element: <ProtectedRoute requiredRole="admin"><AssetInvoiceForm /></ProtectedRoute> },
        { path: "units",       element: <Units />     },
        { path: "adjustments", element: <StockAdjustment /> },

        { path: "purchases",                element: <PurchaseOrders />      },
        { path: "purchases/returns",        element: <PurchaseReturns />     },
        { path: "purchases/returns/create", element: <ProtectedRoute requiredRole="admin"><CreatePurchaseReturn /></ProtectedRoute> },

        { path: "projects",              element: <ProjectsList />    },
        { path: "projects/create",       element: <ProtectedRoute requiredRole="admin"><CreateProject /></ProtectedRoute> },
        { path: "projects/:id",          element: <ProjectDetails />  },
        { path: "projects/:id/labor",               element: <ProjectLaborDetails />         },
        { path: "projects/:id/equipment",           element: <ProjectEquipmentDetails />     },
        { path: "projects/:id/miscellaneous",       element: <ProjectMiscellaneousDetails /> },
        { path: "projects/:id/subcontractor-work",  element: <ProjectSubcontractorWork />    },
        { path: "projects/material-issue/project/:id", element: <ProjectMaterialDetails />   },

        { path: "material-issue/create", element: <ProtectedRoute requiredRole="admin"><CreateMaterialIssue /></ProtectedRoute> },

        { path: "clients",        element: <Clients />      },
        { path: "clients/create", element: <ProtectedRoute requiredRole="admin"><CreateClient /></ProtectedRoute> },

        { path: "finance/supplier-payments",        element: <SupplierPayments />    },
        { path: "finance/supplier-payments/create", element: <ProtectedRoute requiredRole="admin"><CreateSupplierPayment /></ProtectedRoute> },
        { path: "finance/supplier-refunds",         element: <SupplierRefundsList /> },
        { path: "finance/supplier-refunds/create",  element: <ProtectedRoute requiredRole="admin"><SupplierRefundForm /></ProtectedRoute> },
        { path: "finance/supplier-refunds/:id",     element: <SupplierRefundDetails /> },
        { path: "finance/client-payments",          element: <PaymentsList />        },
        { path: "finance/client-payments/create",   element: <ProtectedRoute requiredRole="admin"><CreateClientPayment /></ProtectedRoute> },
        { path: "finance/client-payments/:id",      element: <PaymentDetails />      },
        { path: "finance/general-expenses",         element: <GeneralExpenses />     },
        { path: "finance/general-expenses/:id",     element: <ExpenseDetails />      },

        { path: "ledger/suppliers", element: <SupplierLedger /> },
        { path: "ledger/clients",   element: <ClientLedger />   },

        // ── أدمن فقط ──
        { path: "users",           element: <ProtectedRoute requiredRole="admin"><UsersList />  </ProtectedRoute> },
        { path: "users/create",    element: <ProtectedRoute requiredRole="admin"><CreateUser /> </ProtectedRoute> },
        { path: "users/edit/:id",  element: <ProtectedRoute requiredRole="admin"><EditUser />   </ProtectedRoute> },
        { path: "reports",         element: <ProtectedRoute requiredRole="admin"><ReportsPage /></ProtectedRoute> },
      ],
    },

    // ================= Catch All =================
    {
      path: "*",
      element: <NotFound />,
    },
  ]);

  return (
    <AuthContextProvider>
      <LanguageProvider>
        <ToastContainer
          position="top-right"
          autoClose={3000}
          hideProgressBar={false}
          newestOnTop={false}
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
        />
        <RouterProvider router={router} />
      </LanguageProvider>
    </AuthContextProvider>
  );
}

export default App;
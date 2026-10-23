import Dashboard from "../repository/dashboard.js";

const getDashboard = async (req, res, next) => {
    try {
        res.status(200).json(await Dashboard.obter());
    } catch (error) {
        next(error);
    }
};

const DashboardController = {
    getDashboard
};

export default DashboardController;

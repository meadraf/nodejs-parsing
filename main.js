const {parseData} = require('./parsing')
const fs = require('fs');
const {sequelize, Department, Employee, Salary, Donation, Rate} = require('./models')
const path = require('path');

const filePath = path.join(__dirname, 'dump.txt');

const employeesData = parseData(filePath, 'Employee');
const employeesJson = JSON.stringify(employeesData, null, 2);
const employeesJsonPath = path.join(__dirname, 'employees.json');
fs.writeFileSync(employeesJsonPath, employeesJson);

const ratesData = parseData(filePath, 'Rate');
const ratesJson = JSON.stringify(ratesData, null, 2);
const ratesJsonPath = path.join(__dirname, 'rates.json');
fs.writeFileSync(ratesJsonPath, ratesJson);

function convertToUSD(amount, currency, date) {
    const rate = ratesData.find(rate => rate.sign === currency && rate.date === date);
    return rate ? parseFloat(amount) * parseFloat(rate.value) : null;
}

(async () => {
    try {
        await sequelize.sync({force: true});

        const departmentMap = {};
        for (const emp of employeesData) {
            if (!departmentMap[emp.Department.id]) {
                const department = await Department.create({
                    id: parseInt(emp.Department.id, 10),
                    name: emp.Department.name
                });
                departmentMap[emp.Department.id] = department.id;
            }
        }

        for (const emp of employeesData) {
            const employee = await Employee.create({
                id: parseInt(emp.id, 10),
                name: emp.name,
                surname: emp.surname,
                departmentId: departmentMap[emp.Department.id]
            });

            for (const sal of emp.Salary.Statement) {
                await Salary.create({
                    id: parseInt(sal.id, 10),
                    employeeId: employee.id,
                    amount: parseFloat(sal.amount),
                    date: new Date(sal.date)
                });
            }

            if (Array.isArray(emp.Donation)) {
                for (const don of emp.Donation) {
                    const [amount, currency] = don.amount.split(' ');
                    const amountUsd = convertToUSD(amount, currency, don.date);
                    if (amountUsd !== null) {
                        await Donation.create({
                            id: parseInt(don.id, 10),
                            employeeId: employee.id,
                            amountUsd: amountUsd,
                            date: new Date(don.date)
                        });
                    }
                }
            } else if (emp.Donation) {
                const [amount, currency] = emp.Donation.amount.split(' ');
                const amountUsd = convertToUSD(amount, currency, emp.Donation.date);
                if (amountUsd !== null) {
                    await Donation.create({
                        id: parseInt(emp.Donation.id, 10),
                        employeeId: employee.id,
                        amountUsd: amountUsd,
                        date: new Date(emp.Donation.date)
                    });
                }
            }
        }

        for (const rate of ratesData) {
            await Rate.create({
                sign: rate.sign,
                date: new Date(rate.date),
                value: parseFloat(rate.value)
            });
        }

        console.log('Data successfully inserted');
    } catch (error) {
        console.error('Error inserting data:', error);
    } finally {
        await sequelize.close();
    }
})();
const db = require("../config/db");

async function getDashboardSummary(req,res){

    try{

        const [[pets]] = await db.query(

            `SELECT COUNT(*) total FROM pets`

        );

        const [[owners]] = await db.query(

            `SELECT COUNT(*) total FROM pet_owners`

        );

        const [[vaccinations]] = await db.query(

            `SELECT COUNT(*) total FROM vaccination_records`

        );

        const [[payments]] = await db.query(

            `SELECT COUNT(*) total FROM payments
             WHERE payment_status='Paid'`

        );

        const [[lostPets]] = await db.query(

            `SELECT COUNT(*) total
             FROM pets
             WHERE is_lost=1`

        );

        const [[qrCodes]] = await db.query(

            `SELECT COUNT(*) total
             FROM qr_codes`

        );

        res.json({

            success:true,

            summary:{

                pets:pets.total,

                owners:owners.total,

                vaccinations:vaccinations.total,

                payments:payments.total,

                lostPets:lostPets.total,

                qrCodes:qrCodes.total

            }

        });

    }

    catch(error){

        res.status(500).json({

            success:false,

            message:error.message

        });

    }

}

module.exports={

    getDashboardSummary

};
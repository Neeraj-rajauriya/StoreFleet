// Import the necessary modules here

//tdhk ealv kplq yxyh
import nodemailer from "nodemailer";
export const sendWelcomeEmail = async (user) => {
  // Write your code here
  try{
    const transporter=nodemailer.createTransport({
      service:'gmail',
      auth:{
        user: process.env.STORFLEET_SMPT_MAIL,
        pass: process.env.STORFLEET_SMPT_MAIL_PASSWORD,
      }
    })
    const mailoption={
      from:process.env.STORFLEET_MAIL,
      to:user.email,
      subject:'Welcome to StoreFleet',
      html:`
      <div style="text-align:center">
        <img class="logo" src="https://files.codingninjas.in/logo1-32230.png" alt="Storefleet Logo">
        <h2>Welcome to StoreFleet</h2>
        <p>Hello,${user.name}</p>
        <p>Thank you for registering with Storefleet. We're excited to have you as a new member of our community.</p>
        <a href="your-app-url" style="display: inline-block; padding: 10px 20px; background-color: #4CAF50; color: white; text-decoration: none;">Get Started</a>
      </div>
      `
    }
    await transporter.sendMail(mailoption); 
    console.log("Mail sent sucessfully");

  }
  catch(error){
    console.error("Error Sending welcom mail",error);
  }
};

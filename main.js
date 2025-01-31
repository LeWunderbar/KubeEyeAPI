const express = require('express');
const axios = require('axios');
const dotenv = require('dotenv');
const https = require('https');

dotenv.config();

const app = express();
const port = 3000;

const kubeApiUrl = process.env.KUBE_API_URL;
const token = process.env.KUBE_TOKEN;

const getHeaders = () => {
    return {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
    };
};

app.get('/:namespace/:podName', async (req, res) => {
    const { namespace, podName } = req.params;

    try {
        const response = await axios.get(
            `${kubeApiUrl}/api/v1/namespaces/${namespace}/pods/${podName}`,
            { headers: getHeaders() }
        );

        const podStatus = response.data.status.phase;

        if (podStatus === 'Running') {
            res.json({ status: 'alive' });
        } else {
            res.json({ status: 'dead' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ status: 'dead' });
    }
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});

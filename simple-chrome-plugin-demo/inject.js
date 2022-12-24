
// 通过DOM事件发送消息给content-script
(function () {
	window.reportList = [];
	setInterval(() => {
		if (window.location.href.indexOf('smsManagement') > 0 || window.location.href.indexOf('playerList') > 0) {
			const btnSearch = document.querySelector("#btnSearch"); //sms短信导出
			const submit_btn = document.querySelector("#submit_btn"); //会员明细
			const btnReportExcel = document.querySelector("#btnReportExcel"); //sms短信导出
			if ((btnSearch || submit_btn) && !btnReportExcel) {
				$('#btnSearch,#submit_btn').after(`<button id="btnReportExcel" style="margin-left: 15px;" onclick="handleReportExcel()">导出Excel</button>`);
			}
		}
	}, 1000)

	window.handleReportExcel = function () {
		$("#tipsReportExcel").remove();
		window.reportList = [];
		if (window.location.href.indexOf('smsManagement') > 0) {
			const startDate = $("#startDate").val();
			const endDate = $("#endDate").val();
			const username = $("#username").val();
			const messageType = $("#messageType").val();
			const status = $("#status").val();
			$('#btnReportExcel').after(`<label id="tipsReportExcel" style="margin-left: 15px;">正在导出第0页,请稍后</button>`);
			exportSms(startDate, endDate, username, messageType, status, 0)
		}
		if (window.location.href.indexOf('playerList') > 0) {
			const lastLoginOrigin = $("#tb_domain").val();
			const dtStart = $("#dtStart").val();
			const dtEnd = $("#dtEnd").val();
			const depositAmountStart = $("#depositAmountStart").val();
			const depositAmountEnd = $("#depositAmountEnd").val();
			const depositTimesStart = $("#depositTimesStart").val();
			const depositTimesEnd = $("#depositTimesEnd").val();
			const withdrawAmountStart = $("#withdrawAmountStart").val();
			const withdrawAmountEnd = $("#withdrawAmountEnd").val();
			$('#btnReportExcel').after(`<label id="tipsReportExcel" style="margin-left: 15px;">正在导出第1页,请稍后</button>`);
			exportPlayers(lastLoginOrigin, dtStart, dtEnd, depositAmountStart, depositAmountEnd, depositTimesStart, depositTimesEnd, withdrawAmountStart, withdrawAmountEnd, 1)
		}
	}
	window.exportPlayers = function (lastLoginOrigin, dtStart, dtEnd, depositAmountStart, depositAmountEnd, depositTimesStart, depositTimesEnd, withdrawAmountStart, withdrawAmountEnd, page) {
		$.ajax({
			url: `/op/getPlayers?page=${page}&userKeyword=&accountNonLocked=2&withoutAgent=false&notLikeSearch=true&dtStart=${dtStart} 00:00:00&dtEnd=${dtEnd} 23:59:59&sortByBalance=0&depositTimesStart=${depositTimesStart}&depositTimesEnd=${depositTimesEnd}&depositAmountStart=${depositAmountStart}&depositAmountEnd=${depositAmountEnd}&withdrawAmountStart=${withdrawAmountStart}&withdrawAmountEnd=${withdrawAmountEnd}&lastLoginOrigin=${lastLoginOrigin}&_csrf=f77e997e-5c39-4c9d-9532-fddda4290ed2`,
			type: "GET",
			data: {},
			dataType: "json",
			async: false,  // 默认是true
			success: function (result) {
				if (result.resultList) {
					totalPage = result.totalResult % result.resultPerPage == 0 ? result.totalResult % result.resultPerPage : Math.ceil(result.totalResult / result.resultPerPage);
					result.resultList.forEach(item => {
						window.reportList.push({
							"代理账号": item.upline,
							"会员账号": item.username,
							"真名": item.realName,
							"最近登入域名": item.lastLoginOrigin,
							"最近登入时间": item.lastLoginDt,
							"存款總額": item.depositAmount,
							"提款總額": item.withdrawAmount,
							"存款次数": item.depositTimes,
							"提款次数": item.withdrawTimes
						});
					});
					$('#tipsReportExcel').text(`总${totalPage}页，正在导出第${page}页,请稍后`);
					if (page < totalPage) {
						page = page + 1;
						setTimeout(() => {
							exportPlayers(lastLoginOrigin, dtStart, dtEnd, depositAmountStart, depositAmountEnd, depositTimesStart, depositTimesEnd, withdrawAmountStart, withdrawAmountEnd, page)
						}, 300);
					}
					else {
						exportFile("会员明细");
					}
				} else {
					exportFile("会员明细");

				}
			}
		});
	}


	window.exportSms = function (startDate, endDate, username, messageType, status, page) {
		$.ajax({
			url: `/op/phone/searchSmsHistory?username=${username}&startDate=${startDate} 00:00:00&endDate=${endDate} 23:59:59&messageType=${messageType}&status=${status}&page=${page}&size=200`,
			type: "GET",
			data: {},
			dataType: "json",
			async: false,  // 默认是true
			success: function (result) {
				if (result.success && result.data) {
					result.data.content.forEach(item => {
						let messageType = item.messageType;
						if (messageType == "otp") {
							messageType = "绑定手机号验证";
						}
						if (messageType == "c2c") {
							messageType = "智能提款通知";
						}
						let phoneNumber = item.countryCode + " " + item.phoneNumber;
						let status = item.status;
						if (status == "SUCCESS") {
							status = "发送成功";
						}
						if (status == "FAILED") {
							status = "发送失败";
						}
						window.reportList.push({
							"发送时间": item.sendDateStr,
							"短讯类型": messageType,
							"账号": item.username,
							"手机号": phoneNumber,
							"状态": status
						});
					});
					$('#tipsReportExcel').text(`总${result.data.totalPages}页，正在导出第${page}页,请稍后`);
					if (!result.data.last) {
						page = page + 1;
						setTimeout(() => {
							exportSms(startDate, endDate, username, messageType, status, page)
						}, 300);
					}
					else {
						exportFile("SMS短讯发送记录");
					}
				} else {
					exportFile("SMS短讯发送记录");

				}
			}
		});
	}

	window.exportFile = function (sheetName) {
		if (window.reportList.length > 0) {
			var ws = XLSX.utils.json_to_sheet(window.reportList);
			var wb = XLSX.utils.book_new();
			XLSX.utils.book_append_sheet(wb, ws, sheetName);
			XLSX.writeFile(wb, `${sheetName}.xlsx`);
		}
		$("#tipsReportExcel").remove();
	};

})();
